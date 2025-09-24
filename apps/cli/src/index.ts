import { dbApi } from "@envkit/db";
// import dotenv from "dotenv";

// dotenv.config();

async function main() {
  const me = await dbApi.users.get(process.env.TEST_USER_ID!);
  console.table(me);
}

main();

// try {
//   const me = await dbApi.users.get(process.env.TEST_USER_ID!);
//   console.table(me);
// } catch (error) {
//   if (error instanceof Error) {
//     console.log(
//       error.message.includes("fetch failed") ? "Network error" : error.message
//     );
//   } else {
//     console.log(error);
//   }
// }
