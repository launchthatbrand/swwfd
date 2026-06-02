import { NextResponse } from "next/server";

import { getMondayRecordEditOptions, hasMondayConfig } from "~/server/monday/client";

export const runtime = "nodejs";

const toJson = (body: unknown, status = 200) => {
  return NextResponse.json(body, { status });
};

export const GET = async () => {
  if (!hasMondayConfig()) {
    return toJson(
      {
        ok: false,
        error:
          "Missing Monday configuration. Set MONDAY_API_KEY and MONDAY_BOARD_ID.",
      },
      400,
    );
  }

  try {
    const options = await getMondayRecordEditOptions();
    return toJson({
      ok: true,
      options: {
        gender: options.questionnaireGender,
        entryLevel: options.questionnaireEntryLevel,
        skilled: options.questionnaireSkilled,
        ethnicity: options.questionnaireEthnicity,
        educationLevel: options.questionnaireEducationLevel,
        usWorkEligible: options.questionnaireUsWorkEligible,
        veteran: options.questionnaireVeteran,
        secondChance: options.questionnaireSecondChance,
        transportation: options.questionnaireTransportation,
        workSchedule: options.questionnaireWorkSchedule,
        candidateEducation: options.questionnaireCandidateEducation,
        desiredHourlyWage: options.questionnaireDesiredHourlyWage,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load questionnaire options";
    return toJson({ ok: false, error: message }, 500);
  }
};
