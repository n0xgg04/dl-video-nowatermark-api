import { createClient } from "redis";

const client = createClient();
export const connect = async () => {
    client.on("error", (err) => console.log("Redis Client Error", err));
    client.on("connection", (e) => {
        console.log("Connected");
    });
    await client.connect();
};
export default client;
