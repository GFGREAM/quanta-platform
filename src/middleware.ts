// AUTH TEMPORALMENTE NEUTRALIZADO — middleware no protege ninguna ruta.
// Para reactivar: restaurar getToken + redirect a /login (ver git history).
import { NextResponse } from "next/server";
export function middleware() { return NextResponse.next(); }
export const config = { matcher: [] };
