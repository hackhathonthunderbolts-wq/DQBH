-- Technician demo seed for PostgreSQL deployments.
INSERT INTO technician_skills (technician_id, skill, proficiency, years_experience)
SELECT t.id, v.skill, v.proficiency, v.years
FROM technicians t
JOIN (VALUES
  ('TECH-TX-09','TURBINE_LVL3','EXPERT',6.0),('TECH-TX-09','VIBRATION_ANALYSIS','EXPERT',5.0),('TECH-TX-09','HIGH_VOLTAGE','INTERMEDIATE',3.0),
  ('TECH-MI-14','ROBOTICS_ADV','EXPERT',7.0),('TECH-MI-14','HYDRAULICS_EXPERT','EXPERT',5.0),('TECH-MI-14','PLC_SIEMENS','INTERMEDIATE',4.0),
  ('TECH-CA-03','EUV_VACUUM','EXPERT',8.0),('TECH-CA-03','OPTICS_CALIBRATION','EXPERT',6.0),
  ('TECH-TX-22','TURBINE_LVL3','INTERMEDIATE',4.0),('TECH-TX-22','MECHANICAL_FITTER','EXPERT',6.0)
) AS v(employee_code,skill,proficiency,years) ON t.employee_code=v.employee_code
WHERE NOT EXISTS (SELECT 1 FROM technician_skills s WHERE s.technician_id=t.id AND s.skill=v.skill);

INSERT INTO certifications (technician_id,name,issued_at,expires_at)
SELECT t.id, v.name, NOW()-INTERVAL '365 days', NOW()+v.days*INTERVAL '1 day'
FROM technicians t
JOIN (VALUES
 ('TECH-TX-09','Turbine Level 3',120),('TECH-TX-09','High Voltage Safety',420),
 ('TECH-MI-14','Robotics Advanced',300),('TECH-CA-03','Cleanroom Class 1',20),('TECH-TX-22','Mechanical Fitter',500)
) AS v(employee_code,name,days) ON t.employee_code=v.employee_code
WHERE NOT EXISTS (SELECT 1 FROM certifications c WHERE c.technician_id=t.id AND c.name=v.name);

INSERT INTO shifts (technician_id,start_time,end_time,timezone,max_daily_jobs)
SELECT id,'07:00','16:00','America/Chicago',4 FROM technicians WHERE employee_code='TECH-TX-09'
ON CONFLICT (technician_id) DO NOTHING;
INSERT INTO shifts (technician_id,start_time,end_time,timezone,max_daily_jobs)
SELECT id,'08:00','17:00','America/Chicago',4 FROM technicians WHERE employee_code='TECH-MI-14'
ON CONFLICT (technician_id) DO NOTHING;
INSERT INTO shifts (technician_id,start_time,end_time,timezone,max_daily_jobs)
SELECT id,'06:00','15:00','America/Chicago',3 FROM technicians WHERE employee_code='TECH-CA-03'
ON CONFLICT (technician_id) DO NOTHING;
INSERT INTO shifts (technician_id,start_time,end_time,timezone,max_daily_jobs)
SELECT id,'09:00','18:00','America/Chicago',4 FROM technicians WHERE employee_code='TECH-TX-22'
ON CONFLICT (technician_id) DO NOTHING;

INSERT INTO badges(code,name,description) VALUES
 ('FAST_RESPONDER','Fast Responder','Accepted assignments quickly.'),
 ('ZERO_SLA_BREACHES','Zero SLA Breaches','Completed work within SLA.'),
 ('TEN_JOB_STREAK','10 Jobs Streak','Completed ten jobs in sequence.')
ON CONFLICT (code) DO NOTHING;
