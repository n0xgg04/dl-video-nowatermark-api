import { type NextRequest } from "next/server";
import util from "util";

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

type VideoType = Nullable<"tiktok" | "youtube">;

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const now = performance.now();
    const url = searchParams.get("url");
    let video_type: VideoType;
    if (url?.includes("youtube")) {
        video_type = "youtube";
    } else {
        video_type = "tiktok";
    }

    const resMain: DataResponseMainType = { message: "", time: 0 };
    const resSuccess: DataResponseSuccessType = {
        status: "success",
        data: null,
    };
    const resFailed: DataResponseFailedType = { status: "error", error: "" };
    try {
        const { stdout: rawData, stderr } = await exec(
            `yt-dlp -g -e --get-duration --get-thumbnail ${url}`,
        );
        resMain.message = "Get video success.";
        const data = rawData.split("\n").filter((el: string) => el);
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

        resSuccess.raw = rawData;
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
