import { Router, type IRouter } from "express";
import { db, patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreatePatientBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const patients = await db.select().from(patientsTable).orderBy(patientsTable.createdAt);
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch patients" });
  }
});

router.post("/", async (req, res) => {
  try {
    const parsed = CreatePatientBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input" });
    }
    const { name, age, gender, diabetesType, contactInfo } = parsed.data;
    const [patient] = await db.insert(patientsTable).values({
      name,
      age,
      gender,
      diabetesType: diabetesType ?? null,
      contactInfo: contactInfo ?? null,
    }).returning();
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: "Failed to create patient" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "0", 10);
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch patient" });
  }
});

export default router;
