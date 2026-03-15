import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const school = await prisma.school.findFirst();
    return NextResponse.json(school ?? {});
  } catch (err) {
    console.error("GET /api/settings/school failed:", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, name, logoUrl, city, country, address, phone, email, description } = body;

    let school = await prisma.school.findFirst();
    if (!school) {
      school = await prisma.school.create({
        data: {
          name: name || "Школа",
          logoUrl: logoUrl || null,
          city: city || null,
          country: country || null,
          address: address || null,
          phone: phone || null,
          email: email || null,
          description: description || null,
        },
      });
    } else {
      school = await prisma.school.update({
        where: { id: id || school.id },
        data: {
          ...(name != null && { name: String(name) }),
          ...(logoUrl !== undefined && { logoUrl: logoUrl ? String(logoUrl) : null }),
          ...(city !== undefined && { city: city ? String(city) : null }),
          ...(country !== undefined && { country: country ? String(country) : null }),
          ...(address !== undefined && { address: address ? String(address) : null }),
          ...(phone !== undefined && { phone: phone ? String(phone) : null }),
          ...(email !== undefined && { email: email ? String(email) : null }),
          ...(description !== undefined && { description: description ? String(description) : null }),
        },
      });
    }
    return NextResponse.json(school);
  } catch (err) {
    console.error("PUT /api/settings/school failed:", err);
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }
}
