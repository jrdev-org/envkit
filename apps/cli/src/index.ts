import { ConvexHttpClient, dbApi, safeCall } from "@envkit/db";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.join(process.cwd(), ".env.local"),
});

async function callApi() {
  const res = await fetch(`${process.env.PUBLIC_WEB_APP_URL!}/api/hello`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  const data = await res.json();
  console.log(data);

  return data as { message: string };
}

async function main() {
  const data = await safeCall(async () => await callApi())();
  if ("error" in data) {
    console.log(data.error);
    return;
  }
  const { message } = data;
  console.log(JSON.stringify(message));
  const me = await safeCall(async () => {
    const authId = process.env.TEST_USER_ID;
    if (!authId) {
      console.log("No auth id found");
      return;
    }
    const user = await dbApi.users.get(authId);
    if (!user) {
      console.log("No user found");
      return;
    }
    return user;
  })();
  if (!me) {
    console.log("Loading...");
  }
  if (me && "error" in me) {
    console.log(me.error);
    return;
  }
  me && console.log(JSON.stringify(me));
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
