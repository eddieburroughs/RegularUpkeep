// Inspection Types

export type InspectionType = "quick" | "seasonal" | "full";

export type FindingStatus = "pass" | "attention" | "urgent" | "na";

export interface InspectionFinding {
  status: FindingStatus;
  notes: string;
  photos: string[]; // Storage paths
  createTask: boolean;
  createRequest: boolean;
}

export interface InspectionSection {
  key: string;
  label: string;
  icon: string;
  items: InspectionItem[];
}

export interface InspectionItem {
  key: string;
  label: string;
  description?: string;
}

export interface InspectionMeta {
  type: InspectionType;
  sections: Record<string, Record<string, InspectionFinding>>;
  summary: {
    pass: number;
    attention: number;
    urgent: number;
    na: number;
    total: number;
  };
  completedAt: string;
  generated?: {
    tasks: boolean;
    requests: boolean;
    taskIds?: string[];
    requestIds?: string[];
  };
  export?: {
    pdf_storage_path?: string;
    pdf_generated_at?: string;
  };
}

// Inspection checklist by type
export const INSPECTION_SECTIONS: Record<InspectionType, InspectionSection[]> = {
  quick: [
    {
      key: "safety",
      label: "Safety",
      icon: "Shield",
      items: [
        { key: "smoke_detectors", label: "Smoke Detectors", description: "Test all smoke detectors" },
        { key: "co_detectors", label: "CO Detectors", description: "Test carbon monoxide detectors" },
        { key: "fire_extinguisher", label: "Fire Extinguisher", description: "Check expiration and accessibility" },
      ],
    },
    {
      key: "plumbing",
      label: "Plumbing",
      icon: "Droplets",
      items: [
        { key: "leaks", label: "Visible Leaks", description: "Check under sinks and around toilets" },
        { key: "water_heater", label: "Water Heater", description: "Check for rust or leaks" },
      ],
    },
    {
      key: "hvac",
      label: "HVAC",
      icon: "Thermometer",
      items: [
        { key: "filter", label: "Air Filter", description: "Check if filter needs replacement" },
        { key: "thermostat", label: "Thermostat", description: "Verify proper operation" },
      ],
    },
  ],
  seasonal: [
    {
      key: "safety",
      label: "Safety",
      icon: "Shield",
      items: [
        { key: "smoke_detectors", label: "Smoke Detectors", description: "Test all smoke detectors" },
        { key: "co_detectors", label: "CO Detectors", description: "Test carbon monoxide detectors" },
        { key: "fire_extinguisher", label: "Fire Extinguisher", description: "Check expiration and accessibility" },
        { key: "gfci", label: "GFCI Outlets", description: "Test kitchen and bathroom outlets" },
      ],
    },
    {
      key: "plumbing",
      label: "Plumbing",
      icon: "Droplets",
      items: [
        { key: "leaks", label: "Visible Leaks", description: "Check under sinks and around toilets" },
        { key: "water_heater", label: "Water Heater", description: "Check for rust or leaks" },
        { key: "drains", label: "Slow Drains", description: "Test all sink and tub drains" },
        { key: "toilets", label: "Toilets", description: "Check for running or leaks" },
      ],
    },
    {
      key: "hvac",
      label: "HVAC",
      icon: "Thermometer",
      items: [
        { key: "filter", label: "Air Filter", description: "Check if filter needs replacement" },
        { key: "thermostat", label: "Thermostat", description: "Verify proper operation" },
        { key: "vents", label: "Vents & Registers", description: "Check for blockages" },
      ],
    },
    {
      key: "exterior",
      label: "Exterior",
      icon: "Home",
      items: [
        { key: "gutters", label: "Gutters", description: "Check for clogs and damage" },
        { key: "roof", label: "Roof (Visual)", description: "Look for missing shingles or damage" },
        { key: "siding", label: "Siding", description: "Check for damage or gaps" },
      ],
    },
  ],
  full: [
    {
      key: "safety",
      label: "Safety",
      icon: "Shield",
      items: [
        { key: "smoke_detectors", label: "Smoke Detectors", description: "Test all smoke detectors" },
        { key: "co_detectors", label: "CO Detectors", description: "Test carbon monoxide detectors" },
        { key: "fire_extinguisher", label: "Fire Extinguisher", description: "Check expiration and accessibility" },
        { key: "gfci", label: "GFCI Outlets", description: "Test kitchen and bathroom outlets" },
        { key: "electrical_panel", label: "Electrical Panel", description: "Check for proper labeling and issues" },
        { key: "stairs_railings", label: "Stairs & Railings", description: "Check stability and condition" },
      ],
    },
    {
      key: "plumbing",
      label: "Plumbing",
      icon: "Droplets",
      items: [
        { key: "leaks", label: "Visible Leaks", description: "Check under sinks and around toilets" },
        { key: "water_heater", label: "Water Heater", description: "Check for rust or leaks" },
        { key: "drains", label: "Slow Drains", description: "Test all sink and tub drains" },
        { key: "toilets", label: "Toilets", description: "Check for running or leaks" },
        { key: "water_pressure", label: "Water Pressure", description: "Test faucets throughout home" },
        { key: "hose_bibs", label: "Hose Bibs", description: "Check outdoor faucets" },
      ],
    },
    {
      key: "hvac",
      label: "HVAC",
      icon: "Thermometer",
      items: [
        { key: "filter", label: "Air Filter", description: "Check if filter needs replacement" },
        { key: "thermostat", label: "Thermostat", description: "Verify proper operation" },
        { key: "vents", label: "Vents & Registers", description: "Check for blockages" },
        { key: "outdoor_unit", label: "Outdoor Unit", description: "Check for debris and damage" },
        { key: "ductwork", label: "Visible Ductwork", description: "Check for leaks or damage" },
      ],
    },
    {
      key: "electrical",
      label: "Electrical",
      icon: "Zap",
      items: [
        { key: "outlets", label: "Outlets", description: "Test for proper operation" },
        { key: "switches", label: "Light Switches", description: "Test all switches" },
        { key: "fixtures", label: "Light Fixtures", description: "Check for damage or issues" },
      ],
    },
    {
      key: "exterior",
      label: "Exterior",
      icon: "Home",
      items: [
        { key: "gutters", label: "Gutters", description: "Check for clogs and damage" },
        { key: "roof", label: "Roof (Visual)", description: "Look for missing shingles or damage" },
        { key: "siding", label: "Siding", description: "Check for damage or gaps" },
        { key: "foundation", label: "Foundation", description: "Look for cracks or settling" },
        { key: "windows", label: "Windows", description: "Check seals and operation" },
        { key: "doors", label: "Exterior Doors", description: "Check seals and locks" },
        { key: "driveway", label: "Driveway/Walkways", description: "Check for cracks or damage" },
      ],
    },
    {
      key: "interior",
      label: "Interior",
      icon: "Sofa",
      items: [
        { key: "walls", label: "Walls & Ceilings", description: "Look for cracks or water stains" },
        { key: "floors", label: "Floors", description: "Check for damage or squeaks" },
        { key: "doors_interior", label: "Interior Doors", description: "Check operation and hardware" },
        { key: "windows_interior", label: "Windows (Inside)", description: "Check locks and operation" },
      ],
    },
    {
      key: "appliances",
      label: "Appliances",
      icon: "Refrigerator",
      items: [
        { key: "refrigerator", label: "Refrigerator", description: "Check seals and temperature" },
        { key: "dishwasher", label: "Dishwasher", description: "Run a cycle, check for leaks" },
        { key: "washer_dryer", label: "Washer/Dryer", description: "Check hoses and venting" },
        { key: "garbage_disposal", label: "Garbage Disposal", description: "Test operation" },
      ],
    },
  ],
};

export const INSPECTION_TYPE_LABELS: Record<InspectionType, { label: string; description: string; duration: string }> = {
  quick: {
    label: "Quick Check",
    description: "Essential safety and maintenance items",
    duration: "5-10 minutes",
  },
  seasonal: {
    label: "Seasonal Inspection",
    description: "Comprehensive seasonal maintenance check",
    duration: "15-20 minutes",
  },
  full: {
    label: "Full Home Inspection",
    description: "Complete walkthrough of all systems",
    duration: "30-45 minutes",
  },
};
