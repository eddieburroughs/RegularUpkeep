-- ============================================================================
-- MAINTENANCE TASK TEMPLATES SEED DATA
-- Run after the 20251225_maintenance_calendar.sql migration
-- ============================================================================

-- Clear existing templates (optional - comment out if appending)
-- DELETE FROM maintenance_task_templates;

-- ============================================================================
-- WEEKLY / STORM TASKS (3 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Exterior Walk-Around Inspection',
  'Walk around your property to check for visible damage, pooling water, debris, or anything unusual.',
  'exterior',
  'weekly',
  1,
  NULL,
  'normal',
  15,
  'diy',
  ARRAY['exterior', 'inspection', 'preventive'],
  'homeowner',
  '1. Walk the perimeter of your home
2. Check for cracks in foundation or siding
3. Look for pooling water near foundation
4. Note any loose gutters or trim
5. Check window and door seals
6. Look for pest activity (ant trails, wasp nests)',
  'Take photos of any issues you find to track over time. Best done in daylight after rain.',
  NULL
),
(
  'Post-Storm Damage Check',
  'After any significant storm, inspect your property for damage to roof, siding, trees, and drainage.',
  'exterior',
  'weekly',
  1,
  NULL,
  'high',
  30,
  'diy',
  ARRAY['exterior', 'storm', 'safety', 'inspection'],
  'homeowner',
  '1. Check roof for missing/damaged shingles (binoculars work)
2. Inspect siding for cracks or loose panels
3. Check for fallen branches or tree damage
4. Ensure gutters and downspouts are clear
5. Test exterior outlets (GFCI)
6. Check for standing water in basement/crawl space',
  'Document damage immediately for insurance claims. Take dated photos.',
  'Be careful of downed power lines or unstable trees. Do not climb on wet roof.'
),
(
  'Check for Pooling Water',
  'After rain, check around foundation, basement, and yard for water accumulation.',
  'exterior',
  'weekly',
  1,
  NULL,
  'normal',
  10,
  'diy',
  ARRAY['exterior', 'drainage', 'foundation'],
  'homeowner',
  '1. Walk around foundation after rain
2. Check basement for moisture or puddles
3. Verify gutters draining away from house
4. Check window wells for water
5. Look for soggy spots in yard that don''t drain',
  'Persistent pooling may indicate grading issues. Consider French drain or regrading.',
  NULL
);

-- ============================================================================
-- MONTHLY TASKS (10 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Test Smoke & Carbon Monoxide Detectors',
  'Press test button on all smoke and CO detectors to verify they are working.',
  'safety',
  'monthly',
  1,
  NULL,
  'high',
  10,
  'diy',
  ARRAY['safety', 'fire', 'carbon-monoxide'],
  'homeowner',
  '1. Locate all smoke and CO detectors
2. Press and hold test button on each
3. Verify loud alarm sounds
4. Check batteries (replace if needed)
5. Vacuum dust from detector vents
6. Replace units older than 10 years (smoke) or 7 years (CO)',
  'Replace batteries every 6 months, or use 10-year sealed battery units.',
  'If detector doesn''t sound, replace immediately. This is life safety.'
),
(
  'Test GFCI Outlets',
  'Test all GFCI outlets in kitchen, bathrooms, garage, and outdoor areas.',
  'electrical',
  'monthly',
  1,
  NULL,
  'high',
  10,
  'diy',
  ARRAY['electrical', 'safety', 'outlets'],
  'homeowner',
  '1. Press TEST button - outlet should click off
2. Verify power is off with a lamp or tester
3. Press RESET button - power should restore
4. If test fails, outlet needs replacement',
  'GFCI outlets protect against electric shock in wet areas. They do wear out.',
  'Do not use outlets that fail the test. Call an electrician.'
),
(
  'Replace/Clean HVAC Filter',
  'Check your HVAC filter and replace or clean if dirty. Critical for efficiency and air quality.',
  'hvac',
  'monthly',
  1,
  NULL,
  'high',
  10,
  'diy',
  ARRAY['hvac', 'filter', 'air-quality'],
  'homeowner',
  '1. Turn off HVAC system
2. Locate filter (usually in return air duct or furnace)
3. Note filter size (printed on frame)
4. Remove and inspect - replace if dirty
5. Insert new filter with airflow arrow pointing toward system
6. Turn system back on',
  'Buy filters in bulk. Consider upgrading to MERV-11 for better filtration. Set a calendar reminder.',
  'Running without a filter damages the system and reduces air quality.'
),
(
  'Check Under-Sink Areas for Leaks',
  'Inspect under all sinks for moisture, drips, or water damage.',
  'plumbing',
  'monthly',
  1,
  NULL,
  'normal',
  10,
  'diy',
  ARRAY['plumbing', 'leaks', 'preventive'],
  'homeowner',
  '1. Open cabinet under each sink
2. Run water and garbage disposal while checking
3. Feel supply line connections for moisture
4. Check drain connections for wetness
5. Look for signs of mold or water stains
6. Check water heater connections if accessible',
  'Small leaks become big problems. A $5 fix now prevents $5,000 damage later.',
  NULL
),
(
  'Clean Dryer Lint Trap Area',
  'Clean lint trap, lint trap housing, and area around dryer. Fire prevention.',
  'appliances',
  'monthly',
  1,
  NULL,
  'high',
  15,
  'diy',
  ARRAY['appliances', 'dryer', 'fire-safety'],
  'homeowner',
  '1. Clean lint screen (every load ideally)
2. Use vacuum attachment in lint trap slot
3. Pull dryer out and vacuum behind/around it
4. Check flexible duct for lint buildup
5. Ensure duct is not kinked or crushed',
  'Dryer fires are a leading cause of home fires. Deep clean the vent annually.',
  'Lint is highly flammable. Never run dryer with broken lint trap.'
),
(
  'Clean Dishwasher Filter',
  'Remove and clean dishwasher filter to maintain cleaning performance.',
  'appliances',
  'monthly',
  1,
  NULL,
  'normal',
  10,
  'diy',
  ARRAY['appliances', 'dishwasher', 'cleaning'],
  'homeowner',
  '1. Remove bottom rack
2. Locate filter (usually in bottom center)
3. Twist and lift out filter assembly
4. Rinse under hot water, scrub with soft brush
5. Clean filter housing area
6. Reinstall filter securely',
  'Run an empty hot cycle with 1 cup vinegar monthly for deep cleaning.',
  NULL
),
(
  'Vacuum Refrigerator Coils',
  'Clean dust and pet hair from refrigerator condenser coils for efficiency.',
  'appliances',
  'monthly',
  3,
  NULL,
  'normal',
  15,
  'diy',
  ARRAY['appliances', 'refrigerator', 'efficiency'],
  'homeowner',
  '1. Unplug refrigerator
2. Locate coils (back or bottom front behind kick plate)
3. Use vacuum with brush attachment
4. Gently clean coils - they are fragile
5. Clean floor area around fridge
6. Plug back in',
  'Dirty coils make the fridge work harder and use more energy. More important if you have pets.',
  'Unplug before cleaning. Coils can be sharp.'
),
(
  'Run Unused Fixtures',
  'Run water in rarely-used sinks, showers, and flush toilets to prevent trap dry-out.',
  'plumbing',
  'monthly',
  1,
  NULL,
  'low',
  5,
  'diy',
  ARRAY['plumbing', 'traps', 'odor-prevention'],
  'homeowner',
  '1. Identify rarely-used fixtures (guest bath, basement sink)
2. Run water for 30 seconds
3. Flush toilets
4. This refills drain traps and prevents sewer gas odors',
  'Particularly important for vacation homes or rarely-used bathrooms.',
  NULL
),
(
  'Check Water Heater Temperature',
  'Verify water heater is set to 120°F for safety and efficiency.',
  'plumbing',
  'monthly',
  6,
  NULL,
  'normal',
  5,
  'diy',
  ARRAY['plumbing', 'water-heater', 'safety', 'efficiency'],
  'homeowner',
  '1. Locate temperature dial on water heater
2. Check current setting (120°F is ideal)
3. Adjust if needed
4. Test hot water at faucet after 1 hour',
  '120°F prevents scalding and saves energy. Higher temps waste money.',
  'Be careful around water heater. If you smell gas, leave and call utility company.'
),
(
  'Check Fire Extinguisher',
  'Inspect fire extinguishers for proper pressure and accessibility.',
  'safety',
  'monthly',
  1,
  NULL,
  'high',
  5,
  'diy',
  ARRAY['safety', 'fire', 'extinguisher'],
  'homeowner',
  '1. Check pressure gauge (needle in green zone)
2. Verify pin and tamper seal intact
3. Check for physical damage or corrosion
4. Ensure easily accessible (not blocked)
5. Verify expiration date
6. Know where all extinguishers are located',
  'Have extinguishers in kitchen, garage, and each floor. Replace after 12 years.',
  'Replace immediately if gauge is in red zone or seal is broken.'
);

-- ============================================================================
-- SPRING TASKS (7 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Inspect & Clean Gutters',
  'Clear debris from gutters and downspouts. Check for damage and proper drainage.',
  'exterior',
  'seasonal',
  1,
  ARRAY[3, 4],
  'high',
  60,
  'diy',
  ARRAY['exterior', 'gutters', 'drainage'],
  'homeowner',
  '1. Use stable ladder on level ground
2. Remove leaves and debris by hand or scoop
3. Check for sagging or loose sections
4. Flush with hose to check flow
5. Ensure downspouts direct water away from foundation
6. Consider gutter guards if heavy debris',
  'Clean in both spring (after pollen) and fall (after leaves). Gutter guards reduce but don''t eliminate cleaning.',
  'Use ladder safely. Do not lean or overreach. Consider hiring if steep roof.'
),
(
  'AC System Checkup',
  'Prepare air conditioning for summer season.',
  'hvac',
  'seasonal',
  1,
  ARRAY[4, 5],
  'high',
  30,
  'pro_recommended',
  ARRAY['hvac', 'ac', 'cooling', 'seasonal-prep'],
  'provider',
  '1. Replace air filter
2. Clear debris from outdoor condenser unit (2 ft clearance)
3. Clean condenser fins with hose (gentle pressure)
4. Check refrigerant lines for insulation damage
5. Test system before hot weather
6. Schedule professional tune-up',
  'Professional AC tune-up annually keeps system efficient and catches problems early.',
  'Turn off power before cleaning condenser. Never pressure wash.'
),
(
  'Exterior Caulking & Paint Touchups',
  'Inspect and repair caulking around windows, doors, and trim. Touch up peeling paint.',
  'exterior',
  'seasonal',
  1,
  ARRAY[4, 5],
  'normal',
  120,
  'diy',
  ARRAY['exterior', 'caulking', 'paint', 'weatherproofing'],
  'homeowner',
  '1. Inspect all exterior caulk joints
2. Remove cracked or separated caulk
3. Apply new exterior caulk (paintable silicone)
4. Check for peeling or bubbling paint
5. Scrape, prime, and touch up as needed
6. Pay attention to south-facing areas (more sun damage)',
  'Good caulk and paint prevent water damage and improve energy efficiency.',
  NULL
),
(
  'Test Sump Pump',
  'Verify sump pump is working before spring rains.',
  'plumbing',
  'seasonal',
  1,
  ARRAY[3, 4],
  'high',
  15,
  'diy',
  ARRAY['plumbing', 'sump-pump', 'flooding-prevention'],
  'homeowner',
  '1. Locate sump pump pit in basement
2. Check that pump is plugged in
3. Pour bucket of water into pit
4. Pump should activate and empty pit
5. Check discharge pipe is clear outside
6. Consider battery backup if not installed',
  'A failed sump pump during heavy rain = flooded basement. Battery backup is cheap insurance.',
  'Unplug before reaching into pit. Call plumber if pump doesn''t activate.'
),
(
  'Pressure Wash Exterior',
  'Clean driveway, walkways, deck, and siding to remove winter grime.',
  'exterior',
  'seasonal',
  1,
  ARRAY[4, 5],
  'low',
  180,
  'diy',
  ARRAY['exterior', 'cleaning', 'curb-appeal'],
  'homeowner',
  '1. Rent or buy pressure washer (1500-2500 PSI for home use)
2. Test in inconspicuous area first
3. Clean driveway and walkways
4. Use lower pressure for siding (can damage)
5. Clean deck (may need special cleaner)
6. Clean patio furniture',
  'Too much pressure damages surfaces. Start lower and increase as needed. Wear safety glasses.',
  'Keep away from windows, vents, and electrical outlets. Never aim at people or pets.'
),
(
  'Inspect Deck & Patio',
  'Check deck boards, railings, and stairs for damage, rot, or instability.',
  'exterior',
  'seasonal',
  1,
  ARRAY[4, 5],
  'normal',
  30,
  'diy',
  ARRAY['exterior', 'deck', 'patio', 'safety'],
  'homeowner',
  '1. Walk entire deck checking for soft/rotted boards
2. Test railing stability (should not wobble)
3. Check stairs for loose or damaged treads
4. Look for popped nails or screws
5. Check ledger board connection to house
6. Plan sealing/staining if needed',
  'Catch rot early - board replacement is cheaper than deck replacement.',
  'If ledger board or posts show rot, get professional assessment. Structural concern.'
),
(
  'Service Lawn Equipment',
  'Prepare mower, trimmer, and other lawn equipment for the season.',
  'landscaping',
  'seasonal',
  1,
  ARRAY[3, 4],
  'normal',
  45,
  'diy',
  ARRAY['landscaping', 'lawn', 'equipment'],
  'homeowner',
  '1. Change oil in mower (if 4-stroke)
2. Replace or clean air filter
3. Install new spark plug
4. Sharpen or replace mower blade
5. Check trimmer line
6. Fill with fresh fuel (stabilizer if stored)',
  'A sharp mower blade makes cleaner cuts and healthier grass.',
  'Disconnect spark plug before working on blade.'
);

-- ============================================================================
-- SUMMER TASKS (5 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Reverse Ceiling Fan Direction',
  'Set ceiling fans to run counter-clockwise (pushing air down) for cooling.',
  'interior',
  'seasonal',
  1,
  ARRAY[5, 6],
  'low',
  10,
  'diy',
  ARRAY['interior', 'ceiling-fan', 'cooling', 'efficiency'],
  'homeowner',
  '1. Turn off ceiling fans
2. Look for direction switch on motor housing
3. Set to counter-clockwise (looking up)
4. Fan should push air down when running
5. This creates a cooling breeze',
  'Counter-clockwise in summer (breeze down), clockwise in winter (pulls cool air up, pushes warm air down walls).',
  NULL
),
(
  'Check Irrigation System',
  'Inspect sprinkler heads, check for leaks, and adjust coverage.',
  'landscaping',
  'seasonal',
  1,
  ARRAY[5, 6],
  'normal',
  30,
  'diy',
  ARRAY['landscaping', 'irrigation', 'watering'],
  'homeowner',
  '1. Run each zone manually
2. Check all sprinkler heads for damage
3. Adjust heads for proper coverage
4. Look for dry spots or flooded areas
5. Check for leaks at connections
6. Adjust timer for summer watering schedule',
  'Water early morning to reduce evaporation. Adjust for rainfall.',
  NULL
),
(
  'Exterior Inspection',
  'Summer walkthrough to check siding, foundation, windows, and overall condition.',
  'exterior',
  'seasonal',
  1,
  ARRAY[6, 7],
  'normal',
  30,
  'diy',
  ARRAY['exterior', 'inspection', 'preventive'],
  'homeowner',
  '1. Check siding for cracks, holes, or damage
2. Inspect foundation for cracks
3. Look for gaps around windows and doors
4. Check roof from ground (binoculars)
5. Inspect chimney for damage
6. Note any needed repairs for fall',
  'Take photos to compare year over year.',
  NULL
),
(
  'Mosquito & Standing Water Check',
  'Eliminate standing water sources that breed mosquitoes.',
  'pest_control',
  'seasonal',
  1,
  ARRAY[5, 6, 7, 8],
  'normal',
  15,
  'diy',
  ARRAY['pest-control', 'mosquito', 'standing-water'],
  'homeowner',
  '1. Empty and refresh bird baths weekly
2. Check flower pot saucers for standing water
3. Clear clogged gutters
4. Empty kiddie pools when not in use
5. Check tarps, buckets, tires for collected water
6. Ensure outdoor drains are flowing',
  'Mosquitoes breed in as little as a bottle cap of water.',
  NULL
),
(
  'Check Attic Ventilation',
  'Ensure attic is properly ventilated to prevent heat buildup and moisture.',
  'hvac',
  'seasonal',
  1,
  ARRAY[6, 7],
  'normal',
  20,
  'diy',
  ARRAY['hvac', 'attic', 'ventilation', 'efficiency'],
  'homeowner',
  '1. Check soffit vents for blockage
2. Ensure insulation isn''t blocking vents
3. Check roof vents for debris
4. Look for signs of moisture or mold
5. Consider attic fan if very hot',
  'Proper attic ventilation reduces AC costs and extends roof life.',
  'Be careful in hot attics. Go early morning when cool.'
);

-- ============================================================================
-- FALL TASKS (8 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Fall Gutter Cleaning',
  'Clean gutters after leaves have fallen to ensure winter drainage.',
  'exterior',
  'seasonal',
  1,
  ARRAY[10, 11],
  'high',
  60,
  'diy',
  ARRAY['exterior', 'gutters', 'leaves', 'winter-prep'],
  'homeowner',
  '1. Wait until most leaves have fallen
2. Use stable ladder on level ground
3. Remove leaves and debris
4. Flush with hose
5. Check downspouts for clogs
6. Ensure extensions direct water away',
  'This is the most important gutter cleaning of the year. Clogged gutters + freezing = ice dams.',
  'Use ladder safely. Consider hiring for tall/steep homes.'
),
(
  'Heating System Prep',
  'Prepare furnace/heating system for winter operation.',
  'hvac',
  'seasonal',
  1,
  ARRAY[9, 10],
  'high',
  30,
  'pro_recommended',
  ARRAY['hvac', 'heating', 'furnace', 'winter-prep'],
  'provider',
  '1. Replace air filter
2. Test heating before it''s needed
3. Check thermostat operation
4. Clear area around furnace (3 ft clearance)
5. Check for unusual smells when starting
6. Schedule professional tune-up',
  'Professional furnace tune-up catches problems before the cold. Schedule early.',
  'If you smell gas or burning, turn off and call professional immediately.'
),
(
  'Chimney Inspection',
  'Have chimney inspected before first fire of the season.',
  'safety',
  'seasonal',
  1,
  ARRAY[9, 10],
  'high',
  60,
  'pro_required',
  ARRAY['safety', 'chimney', 'fireplace', 'fire-prevention'],
  'provider',
  '1. Hire certified chimney sweep
2. Inspect for creosote buildup
3. Check for cracks or damage
4. Verify damper operation
5. Check cap and spark arrestor
6. Get chimney cleaned if needed',
  'Never skip this if you use your fireplace. Chimney fires are dangerous and preventable.',
  'Do not use fireplace until inspection is complete.'
),
(
  'Deep Clean Dryer Vent',
  'Clean entire dryer vent from machine to exterior to prevent fires.',
  'appliances',
  'seasonal',
  1,
  ARRAY[10, 11],
  'high',
  45,
  'diy',
  ARRAY['appliances', 'dryer', 'vent', 'fire-prevention'],
  'homeowner',
  '1. Unplug dryer
2. Disconnect vent hose from dryer
3. Use dryer vent brush kit to clean entire run
4. Clean from outside vent opening too
5. Check exterior damper moves freely
6. Reconnect and test',
  'Consider professional cleaning for long or complicated vent runs. Do annually at minimum.',
  'Lint is extremely flammable. This is fire prevention.'
),
(
  'Winterize Outdoor Faucets',
  'Disconnect hoses and prepare outdoor faucets for freezing weather.',
  'plumbing',
  'seasonal',
  1,
  ARRAY[10, 11],
  'high',
  20,
  'diy',
  ARRAY['plumbing', 'winterization', 'freeze-prevention', 'outdoor'],
  'homeowner',
  '1. Disconnect all garden hoses
2. Turn off interior shut-off valves for outdoor faucets
3. Open outdoor faucets to drain
4. Install foam faucet covers
5. Drain and store hoses indoors
6. Drain sprinkler system if applicable',
  'A frozen pipe that bursts causes massive water damage. This is easy prevention.',
  'Do before first hard freeze. Check weather forecasts.'
),
(
  'Seal Drafts & Weatherstripping',
  'Check and replace weatherstripping around doors and windows.',
  'interior',
  'seasonal',
  1,
  ARRAY[10, 11],
  'normal',
  60,
  'diy',
  ARRAY['interior', 'weatherstripping', 'energy-efficiency', 'drafts'],
  'homeowner',
  '1. Check all exterior doors for drafts (use candle test)
2. Inspect weatherstripping for damage
3. Replace worn weatherstripping
4. Check window seals
5. Install door sweeps if drafty
6. Consider plastic film for drafty windows',
  'Sealing drafts is one of the cheapest ways to reduce heating costs.',
  NULL
),
(
  'Test Garage Door Safety',
  'Verify garage door auto-reverse and safety features are working.',
  'safety',
  'seasonal',
  1,
  ARRAY[10, 11],
  'high',
  10,
  'diy',
  ARRAY['safety', 'garage-door', 'auto-reverse'],
  'homeowner',
  '1. Test auto-reverse: place 2x4 on ground, door should reverse when it hits
2. Test photo-eye sensors: wave object through beam while closing
3. Check door balance: disconnect opener, lift manually - should stay in place
4. Lubricate hinges and rollers
5. Check weatherstripping at bottom',
  'Auto-reverse is a life-safety feature. Never disable it.',
  'Keep hands and fingers away from door sections and hinges.'
),
(
  'Clean & Store Lawn Equipment',
  'Winterize mower, trimmer, and other lawn equipment.',
  'landscaping',
  'seasonal',
  1,
  ARRAY[10, 11],
  'normal',
  45,
  'diy',
  ARRAY['landscaping', 'lawn', 'equipment', 'winterization'],
  'homeowner',
  '1. Use up or stabilize remaining fuel
2. Clean underside of mower deck
3. Change oil if due
4. Remove battery from mower (store indoors)
5. Store equipment in dry location
6. Service before storage for easy spring start',
  'Fresh fuel in spring causes most lawn equipment problems. Use fuel stabilizer or run dry.',
  NULL
);

-- ============================================================================
-- WINTER TASKS (5 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Monitor for Ice Dams',
  'Check roof for ice dam formation after heavy snow.',
  'exterior',
  'seasonal',
  1,
  ARRAY[12, 1, 2],
  'high',
  10,
  'diy',
  ARRAY['exterior', 'roof', 'ice-dams', 'winter'],
  'homeowner',
  '1. After heavy snow, check roof edge from ground
2. Look for thick ice buildup at eaves
3. Check for icicles (small = normal, large + dam = problem)
4. Look for water stains on ceilings inside
5. Use roof rake to remove snow from edges if accessible',
  'Ice dams form when attic is warm. Long-term fix is better insulation and ventilation.',
  'Do not chip ice off roof - damages shingles. Call professional for removal.'
),
(
  'Freeze Protection Check',
  'During extreme cold, take steps to prevent frozen pipes.',
  'plumbing',
  'seasonal',
  1,
  ARRAY[12, 1, 2],
  'high',
  15,
  'diy',
  ARRAY['plumbing', 'freeze-prevention', 'winter', 'pipes'],
  'homeowner',
  '1. Open cabinet doors under sinks on exterior walls
2. Let faucets drip slightly if very cold
3. Keep heat at minimum 55°F even when away
4. Check on vacation/unoccupied homes regularly
5. Know where main water shut-off is
6. Consider pipe heating cable for problem areas',
  'Pipes on exterior walls and in unheated spaces are most at risk.',
  'If pipes freeze, turn off water main immediately. Thaw slowly. Call plumber if needed.'
),
(
  'Heating System Monitor',
  'Keep heating system running efficiently through winter.',
  'hvac',
  'seasonal',
  1,
  ARRAY[12, 1, 2],
  'normal',
  10,
  'diy',
  ARRAY['hvac', 'heating', 'efficiency', 'winter'],
  'homeowner',
  '1. Replace air filter regularly (monthly in heavy use)
2. Ensure vents are open and unblocked
3. Check for unusual noises or smells
4. Monitor for uneven heating
5. Consider smart thermostat programming',
  'Changing the filter monthly during heavy use can improve efficiency 5-15%.',
  'Strange smells (burning, gas) = shut off and call professional.'
),
(
  'Check Water Heater Anode Rod',
  'Inspect sacrificial anode rod to extend water heater life.',
  'plumbing',
  'seasonal',
  1,
  ARRAY[1, 2],
  'normal',
  30,
  'diy',
  ARRAY['plumbing', 'water-heater', 'maintenance'],
  'homeowner',
  '1. Turn off water heater
2. Locate anode rod (top of tank)
3. Use socket wrench to remove (1-1/16" usually)
4. Inspect rod - replace if more than 50% corroded
5. Reinstall rod
6. Turn heater back on',
  'Anode rod protects tank from rust. Replacement extends tank life years. Check annually after year 3.',
  'Rod may be stuck. If too hard to remove, call plumber. Don''t force.'
),
(
  'Inspect Appliance Hoses',
  'Check washing machine, dishwasher, and ice maker hoses for wear.',
  'appliances',
  'seasonal',
  1,
  ARRAY[1, 2],
  'normal',
  15,
  'diy',
  ARRAY['appliances', 'hoses', 'leak-prevention'],
  'homeowner',
  '1. Check washing machine hoses for bulges, cracks, or corrosion
2. Check dishwasher supply line
3. Check ice maker line
4. Feel for moisture around connections
5. Replace rubber hoses with braided stainless steel
6. Replace all hoses every 5 years regardless of condition',
  'Burst washing machine hoses are a leading cause of water damage. Stainless braided hoses are worth it.',
  'Turn off water supply before replacing hoses.'
);

-- ============================================================================
-- ANNUAL TASKS (5 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Professional HVAC Service',
  'Annual professional inspection and tune-up of heating and cooling systems.',
  'hvac',
  'annual',
  1,
  ARRAY[3, 4, 9, 10],
  'high',
  90,
  'pro_required',
  ARRAY['hvac', 'annual-service', 'professional'],
  'provider',
  'Professional technician will:
1. Inspect and clean components
2. Check refrigerant levels (AC)
3. Test electrical connections
4. Lubricate moving parts
5. Check thermostat calibration
6. Test safety controls
7. Provide efficiency recommendations',
  'Schedule AC in spring, heating in fall. Many companies offer service plans for both.',
  NULL
),
(
  'Professional Roof Inspection',
  'Annual inspection of roof condition, flashing, and ventilation.',
  'exterior',
  'annual',
  1,
  ARRAY[4, 5, 9, 10],
  'high',
  60,
  'pro_recommended',
  ARRAY['exterior', 'roof', 'inspection', 'annual-service'],
  'provider',
  'Professional inspector will:
1. Check shingles/roofing material condition
2. Inspect flashing around penetrations
3. Check ventilation systems
4. Look for moss or algae growth
5. Inspect gutters and drainage
6. Check attic for leaks or damage
7. Provide remaining life estimate',
  'Catching small roof problems early prevents expensive damage. Most roofing companies offer free inspections.',
  NULL
),
(
  'Septic System Inspection',
  'Annual inspection of septic tank and drain field (if applicable).',
  'plumbing',
  'annual',
  1,
  ARRAY[3, 4],
  'high',
  60,
  'pro_required',
  ARRAY['plumbing', 'septic', 'annual-service'],
  'provider',
  'Professional will:
1. Inspect tank levels
2. Check for sludge buildup
3. Inspect baffles and filters
4. Check drain field condition
5. Test for proper flow
6. Recommend pumping if needed
7. Check for signs of failure',
  'Septic systems should be pumped every 3-5 years depending on use. Annual inspections prevent costly failures.',
  'Septic failure is expensive and messy. Don''t skip this if you have a septic system.'
),
(
  'Deep Clean Windows & Screens',
  'Annual thorough cleaning of all windows and screens.',
  'interior',
  'annual',
  1,
  ARRAY[4, 5, 9, 10],
  'low',
  180,
  'diy',
  ARRAY['interior', 'windows', 'screens', 'cleaning'],
  'homeowner',
  '1. Remove and wash screens (hose + soft brush)
2. Clean window tracks
3. Wash windows inside and out
4. Check window seals while cleaning
5. Lubricate sliding windows/tracks
6. Replace damaged screens',
  'Cleaning windows improves both appearance and allows for damage inspection.',
  'Use stable ladder for exterior windows. Consider professional for multi-story.'
),
(
  'Test and Replace Smoke Detectors',
  'Annual test of all smoke and CO detectors. Replace batteries.',
  'safety',
  'annual',
  1,
  ARRAY[3, 4, 10, 11],
  'high',
  30,
  'diy',
  ARRAY['safety', 'smoke-detector', 'carbon-monoxide', 'annual-service'],
  'homeowner',
  '1. Test all smoke and CO detectors
2. Replace all batteries (even if working)
3. Vacuum dust from detector vents
4. Check manufacture date on each unit
5. Replace detectors over 10 years old
6. Verify proper placement (one per floor minimum)',
  'Time change in spring/fall is good reminder for battery replacement.',
  'This is life safety. Do not skip or delay.'
);

-- ============================================================================
-- MULTI-YEAR TASKS (3-5 YEARS) (4 tasks)
-- ============================================================================

INSERT INTO maintenance_task_templates (
  title, description, category, frequency_type, frequency_interval,
  suggested_months, priority, estimated_minutes, skill_level, tags,
  default_assignee, instructions, pro_tips, warning_notes
) VALUES
(
  'Replace Washing Machine Hoses',
  'Replace washing machine supply hoses regardless of condition.',
  'appliances',
  'multi_year',
  5,
  NULL,
  'high',
  30,
  'diy',
  ARRAY['appliances', 'washing-machine', 'hoses', 'preventive'],
  'homeowner',
  '1. Turn off water supply valves
2. Disconnect old hoses (have towels ready)
3. Inspect valve condition
4. Install new braided stainless steel hoses
5. Hand-tighten plus 1/4 turn with pliers
6. Turn on water and check for leaks',
  'Always use braided stainless steel, not rubber. Write replacement date on hose with marker.',
  'Old rubber hoses can burst without warning. One of the biggest causes of water damage.'
),
(
  'Insurance Policy Review',
  'Review homeowners insurance coverage, deductibles, and inventory.',
  'other',
  'multi_year',
  3,
  NULL,
  'normal',
  60,
  'diy',
  ARRAY['insurance', 'financial', 'review'],
  'homeowner',
  '1. Review current coverage limits
2. Check if rebuilding cost coverage is adequate
3. Update home inventory
4. Take photos/video of valuables
5. Review deductible amount
6. Compare quotes from other insurers
7. Check for available discounts',
  'Home value appreciation means old coverage may be inadequate. Inventory photos make claims much easier.',
  NULL
),
(
  'Tree Inspection & Trimming',
  'Professional assessment of trees near house for health and risk.',
  'landscaping',
  'multi_year',
  3,
  ARRAY[3, 4, 11],
  'normal',
  120,
  'pro_recommended',
  ARRAY['landscaping', 'trees', 'safety', 'storm-damage'],
  'provider',
  'Arborist will:
1. Assess tree health
2. Identify dead or dying branches
3. Check for structural issues
4. Evaluate risk to structures
5. Recommend pruning or removal
6. Check for disease or pest problems',
  'Large dead branches near the house are a liability. Professional trimming prevents storm damage.',
  'Never DIY trim large branches or near power lines. Always use certified arborist.'
),
(
  'Exterior Paint/Siding Assessment',
  'Evaluate condition of exterior paint or siding for repainting.',
  'exterior',
  'multi_year',
  5,
  ARRAY[4, 5, 9, 10],
  'normal',
  30,
  'diy',
  ARRAY['exterior', 'paint', 'siding', 'assessment'],
  'homeowner',
  '1. Walk property examining all sides
2. Check for peeling, bubbling, or fading
3. Look for exposed wood
4. Check caulking condition
5. Note needed repairs
6. Get quotes if repainting needed',
  'Quality exterior paint lasts 7-10 years. Budget for repainting periodically.',
  NULL
);

-- ============================================================================
-- VERIFY INSERTION
-- ============================================================================

-- Count inserted templates
DO $$
DECLARE
  template_count INT;
BEGIN
  SELECT COUNT(*) INTO template_count FROM maintenance_task_templates;
  RAISE NOTICE 'Inserted % maintenance task templates', template_count;
END $$;
