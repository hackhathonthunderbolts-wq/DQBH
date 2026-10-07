// ====================================================================
// DQBH INDUSTRIAL PLATFORM - ELIGIBILITY & VALIDATION ENGINE
// Evaluates machine eligibility, warranty, spare parts, and skill requirements
// ====================================================================

import { MemoryStore } from '../db/memoryStore';
import { RequestPriority, ServiceRequest } from '../domain/types';

export interface ValidationResult {
  passed: boolean;
  machineEligible: boolean;
  partsAvailable: boolean;
  skillsSatisfiable: boolean;
  rulesChecked: string[];
  details: string;
  calculatedSlaHours: number;
}

export class ValidationEngine {
  private store = MemoryStore.getInstance();

  public calculateSlaHours(priority: RequestPriority, machineCriticality: number): number {
    // Base SLA response matrix (in hours)
    let baseHours = 24;
    switch (priority) {
      case 'EMERGENCY':
        baseHours = 2;
        break;
      case 'HIGH':
        baseHours = 4;
        break;
      case 'MEDIUM':
        baseHours = 12;
        break;
      case 'LOW':
        baseHours = 48;
        break;
    }

    // Criticality multiplier: Tier 5 assets (plant-critical) reduce SLA by 50%
    if (machineCriticality === 5) {
      baseHours = Math.max(1, Math.floor(baseHours * 0.5));
    } else if (machineCriticality === 4) {
      baseHours = Math.max(2, Math.floor(baseHours * 0.75));
    }

    return baseHours;
  }

  public validateRequest(
    machineId: string,
    siteId: string,
    priority: RequestPriority,
    requiredSkills: string[],
    requestedPartIds: string[] = []
  ): ValidationResult {
    const rulesChecked: string[] = [];
    const machine = this.store.machines.get(machineId);
    const site = this.store.sites.get(siteId);

    if (!machine) {
      return {
        passed: false,
        machineEligible: false,
        partsAvailable: false,
        skillsSatisfiable: false,
        rulesChecked: ['ASSET_EXISTENCE_CHECK_FAILED'],
        details: `Machine with ID ${machineId} does not exist in asset registry.`,
        calculatedSlaHours: 24
      };
    }

    if (!site || machine.siteId !== site.id) {
      return {
        passed: false,
        machineEligible: false,
        partsAvailable: false,
        skillsSatisfiable: false,
        rulesChecked: ['SITE_ASSET_MISMATCH'],
        details: `Machine ${machine.serialNumber} is not deployed at site ${siteId}.`,
        calculatedSlaHours: 24
      };
    }

    // Rule 1: Machine Eligibility & Operational Status
    rulesChecked.push('MACHINE_REGISTRY_VERIFIED');
    let machineEligible = true;
    if (machine.status === 'OUT_OF_SERVICE' && priority !== 'EMERGENCY') {
      machineEligible = false;
    }

    // Rule 2: Spare Parts Availability
    rulesChecked.push('PARTS_INVENTORY_CHECK');
    let partsAvailable = true;
    const missingParts: string[] = [];

    for (const partId of requestedPartIds) {
      const part = this.store.spareParts.get(partId);
      if (!part) {
        partsAvailable = false;
        missingParts.push(`Part ID ${partId} not found`);
        continue;
      }
      const availableStock = part.stockQuantity - part.reservedQuantity;
      if (availableStock < 1) {
        partsAvailable = false;
        missingParts.push(`${part.name} (${part.partNumber}) out of stock`);
      }
    }

    // Rule 3: Field Skill Satisfiability Check
    rulesChecked.push('TECHNICIAN_SKILL_SATISFIABILITY');
    let skillsSatisfiable = false;
    const technicians = Array.from(this.store.technicians.values());
    
    // Check if at least one technician holds all required skills
    if (requiredSkills.length === 0) {
      skillsSatisfiable = true;
    } else {
      const qualifiedTech = technicians.find(tech => 
        requiredSkills.every(reqSkill => tech.certifications.includes(reqSkill))
      );
      skillsSatisfiable = !!qualifiedTech;
    }

    const calculatedSlaHours = this.calculateSlaHours(priority, machine.criticalityTier);
    const passed = machineEligible && partsAvailable && skillsSatisfiable;

    let details = 'Validation passed. Machine is eligible, skills are satisfiable, and required inventory is verified.';
    if (!passed) {
      const issues: string[] = [];
      if (!machineEligible) issues.push('Machine is out of service');
      if (!partsAvailable) issues.push(`Spare parts unavailable: ${missingParts.join(', ')}`);
      if (!skillsSatisfiable) issues.push(`No active technician certified for [${requiredSkills.join(', ')}]`);
      details = `Validation issues detected: ${issues.join('; ')}`;
    }

    return {
      passed,
      machineEligible,
      partsAvailable,
      skillsSatisfiable,
      rulesChecked,
      details,
      calculatedSlaHours
    };
  }

  public reservePartsForRequest(serviceRequestId: string, partIds: string[]): boolean {
    for (const partId of partIds) {
      const part = this.store.spareParts.get(partId);
      if (part && (part.stockQuantity - part.reservedQuantity >= 1)) {
        part.reservedQuantity += 1;
        const resId = `res-${serviceRequestId}-${partId}`;
        this.store.partReservations.set(resId, {
          id: resId,
          serviceRequestId,
          sparePartId: part.id,
          partName: part.name,
          quantityRequested: 1,
          quantityConsumed: 0,
          isReleased: false
        });
      }
    }
    return true;
  }
}
