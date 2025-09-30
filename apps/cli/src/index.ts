import { dbApi, safeCall } from "@envkit/db";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
});

async function main() {
  const me = await safeCall(
    async () => await dbApi.users.get(process.env.TEST_USER_ID!)
  )();
  if ("error" in me) {
    console.log(me.error);
    return;
  }
  console.table(me);
  return;
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
