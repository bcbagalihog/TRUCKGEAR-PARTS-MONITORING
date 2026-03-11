import { db } from "./db";
import * as schema from "@shared/schema";
import { log } from "./index";

async function main() {
  log("Starting database seeding...", "seed");

  // 1. Clear existing data (Optional, but helps prevent duplicates during testing)
  // Caution: This will wipe your tables. Remove if you want to keep existing data.
  // await db.delete(schema.products);
  // await db.delete(schema.vendors);

  // 2. Insert Sample Vendors
  log("Seeding vendors...", "seed");
  const [vendor1] = await db
    .insert(schema.vendors)
    .values([
      {
        name: "Global EV Components Ltd",
        email: "sales@globalev.com",
        phone: "+63 917 555 0123",
        address: "Industrial Zone, Shanghai, China",
        leadTimeDays: 14,
      },
      {
        name: "Manila Truck Parts Hub",
        email: "info@truckpartsph.com",
        phone: "02-8888-1234",
        address: "Quezon City, Metro Manila",
        leadTimeDays: 3,
      },
    ])
    .returning();

  // 3. Insert Sample Products (Truck & EV)
  log("Seeding products...", "seed");
  await db.insert(schema.products).values([
    {
      sku: "TG-EV-CHG-001",
      name: "Type 2 to CCS2 EV Adapter",
      description: "High-speed charging adapter for European standard EVs",
      category: "EV Charging",
      brand: "ChargeMaster",
      stockQuantity: 15,
      reorderPoint: 5,
      costPrice: "4500.00",
      sellingPrice: "7500.00",
      zone: "A",
      shelf: "S1",
      bin: "B01",
      isEvSpecific: true,
      technicalSpecs: {
        voltage: "400V",
        max_current: "32A",
        standard: "IEC 62196",
      },
    },
    {
      sku: "TG-TRK-BRK-099",
      name: "Heavy Duty Brake Pads - Isuzu Giga",
      description: "Ceramic brake pads for Isuzu Giga series trucks",
      category: "Braking System",
      brand: "StopPro",
      stockQuantity: 40,
      reorderPoint: 10,
      costPrice: "1200.00",
      sellingPrice: "2450.00",
      zone: "B",
      shelf: "S4",
      bin: "B12",
      isEvSpecific: false,
    },
  ]);

  log("Seeding completed successfully!", "seed");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
