import { PrismaClient, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@taskflow.local";
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash,
    },
  });

  const work = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: "Work" } },
    update: {},
    create: { name: "Work", color: "#2383e2", userId: user.id },
  });

  const personal = await prisma.category.upsert({
    where: { userId_name: { userId: user.id, name: "Personal" } },
    update: {},
    create: { name: "Personal", color: "#448361", userId: user.id },
  });

  const existingTasks = await prisma.task.count({ where: { userId: user.id } });
  if (existingTasks === 0) {
    await prisma.task.createMany({
      data: [
        {
          title: "Review the quarterly roadmap",
          description: "Read through the proposed milestones and leave comments.",
          status: TaskStatus.ACTIVE,
          userId: user.id,
          categoryId: work.id,
          dueDate: new Date("2026-06-20T17:00:00Z"),
        },
        {
          title: "Prepare standup notes",
          status: TaskStatus.ACTIVE,
          userId: user.id,
          categoryId: work.id,
        },
        {
          title: "Book dentist appointment",
          status: TaskStatus.ACTIVE,
          userId: user.id,
          categoryId: personal.id,
        },
        {
          title: "Set up the new task manager",
          description: "Try TaskFlow and organize the week.",
          status: TaskStatus.COMPLETED,
          userId: user.id,
          categoryId: personal.id,
        },
      ],
    });
  }

  console.log(`Seeded user ${user.email} with categories and tasks.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
