import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createDriveClient, listFolderVideos } from "@/app/lib/google-auth";
import { Subject, Video } from "@/app/types";

const FOLDER_IDS = {
  anatomia: process.env.GOOGLE_DRIVE_FOLDER_MATH!,
  histologia: process.env.GOOGLE_DRIVE_FOLDER_SCIENCE!,
};

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get("access_token")?.value;
    const studentCode = cookieStore.get("student_code")?.value;
    const allowedSubjectsStr = cookieStore.get("allowed_subjects")?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    if (!studentCode) {
      return NextResponse.json(
        {
          success: false,
          message: "No student code found",
        },
        { status: 403 }
      );
    }

    let allowedSubjects: string[] = [];
    if (allowedSubjectsStr) {
      try {
        allowedSubjects = JSON.parse(allowedSubjectsStr);
      } catch (e) {
        console.error("Error parsing allowed subjects:", e);
      }
    }

    if (allowedSubjects.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No subjects allowed for this student",
        },
        { status: 403 }
      );
    }

    const driveClient = createDriveClient(accessToken);
    const subjects: Subject[] = [];

    for (const [subjectName, folderId] of Object.entries(FOLDER_IDS)) {
      if (!allowedSubjects.includes(subjectName)) {
        continue;
      }

      const files = await listFolderVideos(folderId, driveClient);

      const videos: Video[] = files.map((file) => ({
        id: file.id,
        name: file.name,
        link: `https://drive.google.com/file/d/${file.id}/preview`,
        thumbnailLink: file.thumbnailLink,
        createdTime: file.createdTime,
      }));

      subjects.push({
        id: folderId,
        name: subjectName === "anatomia" ? "Anatomía" : "Histología",
        videos,
      });
    }

    return NextResponse.json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Videos fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch videos",
      },
      { status: 500 }
    );
  }
}
