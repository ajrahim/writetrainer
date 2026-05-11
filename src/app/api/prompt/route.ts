import { NextResponse } from "next/server";
import { generateGrePromptWithOpenAi } from "@/lib/aiReviews";
import type { EssayType } from "@/types/review";

export const runtime = "nodejs";

type PromptRequestBody = {
  type?: unknown;
};

function toEssayType(value: unknown): EssayType | undefined {
  return value === "Issue" || value === "Argument" ? value : undefined;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PromptRequestBody;

  try {
    const prompt = await generateGrePromptWithOpenAi(toEssayType(body.type));
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to generate a ChatGPT prompt.",
      },
      { status: 503 },
    );
  }
}
