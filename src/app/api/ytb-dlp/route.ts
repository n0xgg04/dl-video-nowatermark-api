import { type NextRequest } from "next/server";
import util from "util";
import axios from "axios";
import { Root, tryTikwm } from "@lta/app/api/ytb-dlp/types/tikwm";
import client, { connect } from "@lta/utils/redis";
import _ from "lodash";
const exec = util.promisify(require("child_process").exec);
export const dynamic = "force-dynamic";
type Nullable<T> = T | null;
type VideoData = Nullable<{
    title: string;
    description?: string;
    url: string;
    duration: number | string;
    thumbnail: string;
    music?: string;
}>;
type DataResponseSuccessType = {
    status: "success";
    data: VideoData;
    raw?: any;
};
type DataResponseFailedType = {
    status: "error";
    error: string;
};
type DataResponseMainType = {
    message: string;
    time: number;
};
type DataResponseType = DataResponseMainType &
    (DataResponseSuccessType | DataResponseFailedType);

let connectRedis = 0;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const now = performance.now();
    const url = searchParams.get("url")!;
    if (connectRedis === 0) {
        await connect();
        connectRedis = 1;
    }
    if (_.isEmpty(url)) throw new Error("Empty url");

    const resMain: DataResponseMainType = { message: "", time: 0 };
    const resSuccess: DataResponseSuccessType = {
        status: "success",
        data: null,
    };
    const resFailed: DataResponseFailedType = { status: "error", error: "" };
    try {
        if (url?.includes("tiktok")) {
            const cachedData = await client.hGetAll("tik" + url);
            let data;
            if (!_.isEmpty(cachedData)) {
                data = cachedData;
            } else {
                const tikwm = await tryTikwm(url!);
                if (tikwm) {
                    data = {
                        thumbnail: tikwm.data.cover,
                        url: tikwm.data.play,
                        title: tikwm.data.title,
                        music: tikwm.data.music,
                        duration: tikwm.data.duration,
                        description: tikwm.data.title,
                    };
                    await client.hSet("tik" + url, data);
                    await client.expire("tik" + url, 60 * 60 * 24);
                }
            }
            return Response.json({
                message: "Get video success.",
                data,
            } as DataResponseType);
        }
        const cachedData = await client.get(url);
        let data: string[];
        if (_.isEmpty(cachedData)) {
            const { stdout: rawData } = await exec(
                `yt-dlp -g -e --get-duration --get-thumbnail ${url}`,
            );
            data = rawData.split("\n").filter((el: string) => el);
            await client.set(url, JSON.stringify(data));
            await client.expire(url, 60 * 60 * 24);
        } else {
            data = JSON.parse(cachedData!);
        }
        resMain.message = "Get video success.";

        if (url?.includes("youtube")) {
            resSuccess.data = {
                title: data[0],
                url: data[1],
                duration: data[4],
                thumbnail: data[3],
                music: data[2],
            } as VideoData;
        } else if (url?.includes("facebook")) {
            resSuccess.data = {
                title: data[0],
                url: data[1],
                duration: data[4],
                thumbnail: data[3],
                music: data[2],
            } as VideoData;
        } else if (url?.includes("tiktok")) {
            resSuccess.data = {
                title: data[0],
                url: data[1],
                duration: Number(data[3]),
                thumbnail: data[2],
            } as VideoData;
        } else if (url?.includes("instagram")) {
            resSuccess.data = {
                title: data[0],
                url: data[1],
                duration: Number(data[3]),
                thumbnail: data[2],
            } as VideoData;
        }

        //resSuccess.raw = rawData;
    } catch (e) {
        resMain.message = "Get video failed.";
        resFailed.error = (e as unknown as Error).toString();
    }
    resMain.time = Number(
        (Math.round(performance.now() - now) / 1000).toFixed(3),
    );
    const res: DataResponseType = Object.assign(
        resMain,
        resFailed.error ? resFailed : resSuccess,
    );
    return Response.json(res);
}
