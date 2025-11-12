//This file is used to store the questions and their answer in the database and it is only executed once

const prisma = require("../../config/prismaClient");

async function main() {
  const dummyQuestions = [
    {
      question: "this is a dummy question 1",
      response: "this is a dummy response 1 ",
      section_id: "07317862-2b50-46f8-af6d-4cc1fe2872d9", 
    },
    {
      question: "this is a dummy question 2",
      response: "this is a dummy response 2",
      section_id: "07317862-2b50-46f8-af6d-4cc1fe2872d9",
    },
    {
      question: "this is a dummy question 3",
      response: "this is a dummy response 3",
      section_id: "07317862-2b50-46f8-af6d-4cc1fe2872d9",
    },
    {
      question: "this is a dummy question 4",
      response: "this is a dummy response 4",
      section_id: "07317862-2b50-46f8-af6d-4cc1fe2872d9",
    }
  ];

  for (const q of dummyQuestions) {
    await prisma.chatbot_questions.create({
      data: q
    });
  }

  console.log('Dummy chatbot questions inserted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });