// ====================================================================
// DQBH INDUSTRIAL PLATFORM - DYNAMIC ROUTING & DISPATCH ENGINE
// Multi-factor geo-proximity, skill certification, workload & rating scorer
// ====================================================================

import { MemoryStore } from '../db/memoryStore';
import { GeoLocation, ServiceRequest, Technician, TechnicianMatchScore } from '../domain/types';

export class RoutingEngine {
  private store = MemoryStore.getInstance();

  /**
   * Calculates Great-Circle Distance between two coordinates in Kilometers using the Haversine formula
   */
  public calculateHaversineDistanceKm(loc1: GeoLocation, loc2: GeoLocation): number {
    const R = 6371; // Earth's mean radius in km
    const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
    const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
    
    const lat1Rad = loc1.latitude * (Math.PI / 180);
    const lat2Rad = loc2.latitude * (Math.PI / 180);

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(2));
  }

  /**
   * Evaluates and scores all technicians against a target service request
   */
  public matchTechniciansForRequest(serviceRequest: ServiceRequest): TechnicianMatchScore[] {
    const site = this.store.sites.get(serviceRequest.siteId);
    if (!site) return [];

    const maxProximityThresholdKm = 250; // Maximum dispatch radius in km
    const allTechnicians = Array.from(this.store.technicians.values());

    const scores: TechnicianMatchScore[] = allTechnicians.map((tech: Technician) => {
      // 1. Distance Calculation
      const distanceKm = this.calculateHaversineDistanceKm(tech.currentLocation, site.location);
      
      // Geo Score (0 to 100): 100 at 0km, scaling linearly down to 0 at maxProximityThresholdKm
      const geoScore = Math.max(0, 100 * (1 - distanceKm / maxProximityThresholdKm));

      // 2. Skill Certification Matching
      let skillMatchRate = 1.0;
      if (serviceRequest.requiredSkills.length > 0) {
        const matchingCerts = serviceRequest.requiredSkills.filter(reqSkill => 
          tech.certifications.includes(reqSkill)
        );
        skillMatchRate = matchingCerts.length / serviceRequest.requiredSkills.length;
      }
      const skillScore = skillMatchRate * 100;

      // 3. Workload Capacity Score
      const capacityRemaining = Math.max(0, tech.maxConcurrentJobs - tech.activeJobCount);
      const workloadFactor = capacityRemaining / Math.max(1, tech.maxConcurrentJobs);
      const workloadScore = workloadFactor * 100;

      // 4. Performance Rating Score (1 to 5 mapped to 20 to 100)
      const ratingFactor = tech.serviceRating / 5.0;
      const ratingScore = ratingFactor * 100;

      // Eligibility Hard Constraints
      let isEligible = true;
      let disqualificationReason: string | undefined;

      if (tech.currentStatus === 'OFFLINE' || tech.currentStatus === 'RESTING') {
        isEligible = false;
        disqualificationReason = `Technician status is currently ${tech.currentStatus}`;
      } else if (tech.activeJobCount >= tech.maxConcurrentJobs) {
        isEligible = false;
        disqualificationReason = 'Technician is at maximum concurrent job capacity';
      } else if (skillMatchRate < 1.0 && serviceRequest.priority === 'EMERGENCY') {
        isEligible = false;
        disqualificationReason = 'Missing mandatory skill certifications for emergency level ticket';
      }

      // Composite Multi-Factor Score:
      // - 40% Geo Proximity
      // - 35% Skill Compatibility
      // - 15% Workload Availability
      // - 10% Historical Service Rating
      const compositeScore = Number((
        0.40 * geoScore +
        0.35 * skillScore +
        0.15 * workloadScore +
        0.10 * ratingScore
      ).toFixed(1));

      return {
        technician: tech,
        score: isEligible ? compositeScore : 0,
        distanceKm,
        skillMatchRate: Number(skillMatchRate.toFixed(2)),
        workloadFactor: Number(workloadFactor.toFixed(2)),
        ratingFactor: Number(ratingFactor.toFixed(2)),
        isEligible,
        disqualificationReason
      };
    });

    // Sort ranked candidates descending by composite score
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Automatically assigns and dispatches the highest scoring eligible technician
   */
  public autoDispatch(serviceRequestId: string): { success: boolean; technician?: Technician; matchScore?: TechnicianMatchScore; message: string } {
    const request = this.store.serviceRequests.get(serviceRequestId);
    if (!request) {
      return { success: false, message: `Service request ${serviceRequestId} not found.` };
    }

    const rankedCandidates = this.matchTechniciansForRequest(request);
    const optimalMatch = rankedCandidates.find(c => c.isEligible && c.score > 0);

    if (!optimalMatch) {
      return {
        success: false,
        message: 'No eligible technicians currently available within geographic and certification thresholds.'
      };
    }

    const tech = optimalMatch.technician;
    
    // Assign technician and update status
    request.assignedTechnicianId = tech.id;
    request.assignedTechnicianName = tech.fullName;
    request.state = 'ASSIGNED';
    request.updatedAt = new Date().toISOString();

    tech.activeJobCount += 1;
    tech.currentStatus = 'DISPATCHED';

    // Record audit block
    this.store.recordAudit(
      'SERVICE_REQUEST',
      request.id,
      'TECHNICIAN_AUTO_DISPATCHED',
      'ROUTING_ENGINE',
      'SYSTEM_ADMIN',
      { previousState: 'VALIDATED' },
      { assignedTechnicianId: tech.id, matchScore: optimalMatch.score, distanceKm: optimalMatch.distanceKm }
    );

    return {
      success: true,
      technician: tech,
      matchScore: optimalMatch,
      message: `Technician ${tech.fullName} (${tech.employeeCode}) successfully dispatched with match score ${optimalMatch.score}/100.`
    };
  }
}
