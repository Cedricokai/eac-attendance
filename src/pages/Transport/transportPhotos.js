import excavator from "./assets/fleet-excavator.webp";
import earthmoving from "./assets/fleet-earthmoving.webp";
import troopCarrier from "./assets/fleet-troop-carrier.jpg";
import mineTrucks from "./assets/fleet-mine-trucks.webp";
export const transportPhotos={excavator,earthmoving,troopCarrier,mineTrucks};
export function transportVehiclePhoto(vehicle={}){const label=[vehicle.type,vehicle.category,vehicle.name,vehicle.make,vehicle.model].filter(Boolean).join(" ").toLowerCase();if(/excavator|backhoe|dozer|loader|grader/.test(label))return excavator;if(/truck|dumper|tipper|haul|mining/.test(label)&&!/pickup|pick.up|hilux|ranger/.test(label))return mineTrucks;return troopCarrier;}
export function transportNavigationPhoto(path){if(/driver|users/.test(path))return troopCarrier;if(/fuel|vehicles|Dashboard/.test(path))return mineTrucks;return excavator;}
