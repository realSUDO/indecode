import { db } from "./index";
import { users, organizations, projects } from "./schema";

async function seed() {
  console.log("Seeding dummy data...");
  
  // Create user
  try {
    await db.insert(users).values({
      id: "system",
      name: "System User",
      email: "system@indecode.local",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Created user.");
  } catch (e: any) {
    console.log("User might exist:", e.message);
  }
  
  // Create organization
  try {
    await db.insert(organizations).values({
      id: "1",
      name: "Indecode Local",
      slug: "indecode-local",
      ownerId: "system",
      createdAt: new Date(),
    });
    console.log("Created org.");
  } catch (e: any) {
    console.log("Org might exist:", e.message);
  }
  
  // Create project
  try {
    await db.insert(projects).values({
      id: "1",
      name: "Default Project",
      organizationId: "1",
      userId: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("Created project.");
  } catch (e: any) {
    console.log("Project might exist:", e.message);
  }

  console.log("Done seeding dummy data!");
  process.exit(0);
}

seed().catch(console.error);
