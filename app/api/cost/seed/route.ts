export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import sql from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'

// ── Giá nguyên liệu thô ────────────────────────────────────────────────────
// price_per_unit = giá / đơn vị (đ/g hoặc đ/ml hoặc đ/cái)
const MATERIALS = [
  { name: 'Lục trà Lài',       unit: 'g',    price_per_unit: 170,    min_quantity: 100, price_note: '170K/1kg' },
  { name: 'Trà đen Novia',     unit: 'g',    price_per_unit: 140,    min_quantity: 100, price_note: '140K/1kg' },
  { name: 'Trà đen hoàng Gia', unit: 'g',    price_per_unit: 120,    min_quantity: 100, price_note: '60K/500g' },
  { name: 'Đường trắng',       unit: 'g',    price_per_unit: 19,     min_quantity: 200, price_note: '19K/1kg' },
  { name: 'Đường đen',         unit: 'g',    price_per_unit: 80,     min_quantity: 100, price_note: '80K/1kg' },
  { name: 'Bột kem béo',       unit: 'g',    price_per_unit: 95,     min_quantity: 100, price_note: '95K/1kg' },
  { name: 'Rich lùn',          unit: 'ml',   price_per_unit: 72.71,  min_quantity: 100, price_note: '33K/454ml' },
  { name: 'Sữa đặc',           unit: 'g',    price_per_unit: 68.42,  min_quantity: 200, price_note: '26K/380g' },
  { name: 'Trân châu trắng',   unit: 'g',    price_per_unit: 31.5,   min_quantity: 500, price_note: '126K/4kg' },
  { name: 'Trân châu đen',     unit: 'g',    price_per_unit: 37.5,   min_quantity: 500, price_note: '150K/4kg' },
  { name: 'Tắc',               unit: 'trái', price_per_unit: 500,    min_quantity: 20,  price_note: '25K/kg (~50 trái)' },
  { name: 'Đá me',             unit: 'g',    price_per_unit: 54.44,  min_quantity: 200, price_note: '49K/900g' },
  { name: 'Cốt xí muội',       unit: 'g',    price_per_unit: 94,     min_quantity: 100, price_note: '47K/500g' },
  { name: 'Sữa tươi',          unit: 'ml',   price_per_unit: 38.17,  min_quantity: 500, price_note: '229K/6L' },
  { name: 'Bột matcha',        unit: 'g',    price_per_unit: 608,    min_quantity: 50,  price_note: '304K/500g' },
  { name: 'Ly nhỏ 500ml',      unit: 'cái',  price_per_unit: 475,    min_quantity: 50,  price_note: '95K/200 ly' },
  { name: 'Ly lớn 700ml',      unit: 'cái',  price_per_unit: 550,    min_quantity: 50,  price_note: '110K/200 ly' },
  { name: 'Ống hút nhỏ',       unit: 'cái',  price_per_unit: 76,     min_quantity: 100, price_note: '38K/500 ống' },
  { name: 'Ống hút lớn',       unit: 'cái',  price_per_unit: 190,    min_quantity: 50,  price_note: '38K/200 ống' },
  { name: 'Muỗng',             unit: 'cái',  price_per_unit: 165,    min_quantity: 50,  price_note: '33K/200 muỗng' },
  { name: 'Túi đựng',          unit: 'cái',  price_per_unit: 222,    min_quantity: 50,  price_note: '89K/~400 túi (2kg)' },
  { name: 'Đá',                unit: 'ly',   price_per_unit: 1000,   min_quantity: 0,   price_note: '1K/ly' },
]

// ── Công thức mỗi ly (đã quy đổi qua cốt trà trung gian) ──────────────────
// Cốt trà tắc: 35g Lục trà Lài + 5g Trà đen Novia + 150g đường trắng → 2200ml
// Nước đường:  1000g đường trắng → 1200ml
//
// Cốt trà sữa: 30g Trà đen HG + 20g Trà đen Novia + 100g Bột kem béo
//              + 160g Sữa đặc + 160g Đường đen + 50ml Rich lùn → 2400ml

type Ingredients = Record<string, number>

const RECIPES: { names: string[]; ingredients: Ingredients }[] = [
  // ── Trà Tắc (bán 10K) ── 200ml cốt tắc + 50ml nước đường + 2 tắc
  {
    names: ['Trà Tắc', 'Tra Tac', 'TRÀ TẮC'],
    ingredients: {
      'Lục trà Lài':    35 / 2200 * 200,        // 3.182g
      'Trà đen Novia':  5  / 2200 * 200,         // 0.455g
      // đường từ cốt + nước đường
      'Đường trắng':    150 / 2200 * 200 + 1000 / 1200 * 50,  // 55.3g
      'Tắc':            2,
      'Ống hút nhỏ':    1,
      'Muỗng':          1,
      'Đá':             1,
      'Túi đựng':       1,
      'Ly nhỏ 500ml':   1,
    },
  },
  // ── Trà Me (bán 15K) ── 200ml cốt tắc + 40ml nước đường + 1 tắc + 50g đá me
  {
    names: ['Trà Me', 'Tra Me', 'TRÀ ME'],
    ingredients: {
      'Lục trà Lài':   35 / 2200 * 200,
      'Trà đen Novia': 5  / 2200 * 200,
      'Đường trắng':   150 / 2200 * 200 + 1000 / 1200 * 40,  // 46.97g
      'Tắc':           1,
      'Đá me':         50,
      'Ống hút nhỏ':   1,
      'Muỗng':         1,
      'Đá':            1,
      'Túi đựng':      1,
      'Ly nhỏ 500ml':  1,
    },
  },
  // ── Trà Tắc Xí Muội (bán 15K) ── 200ml cốt tắc + 40ml nước đường + 1 tắc + 50g xí muội
  {
    names: ['Trà Tắc Xí Muội', 'Trà Xí Muội', 'xi muoi', 'Xí Muội'],
    ingredients: {
      'Lục trà Lài':   35 / 2200 * 200,
      'Trà đen Novia': 5  / 2200 * 200,
      'Đường trắng':   150 / 2200 * 200 + 1000 / 1200 * 40,
      'Tắc':           1,
      'Cốt xí muội':   50,
      'Ống hút nhỏ':   1,
      'Muỗng':         1,
      'Đá':            1,
      'Túi đựng':      1,
      'Ly nhỏ 500ml':  1,
    },
  },
  // ── Trà Sữa Nhỏ (bán 20K) ── 150ml cốt trà sữa + 50g TCT + 50g TCD
  {
    names: ['Trà Sữa Nhỏ', 'Trà sữa nhỏ', 'tra sua nho', 'Trà sữa 20K'],
    ingredients: {
      'Trà đen hoàng Gia': 30 / 2400 * 150,   // 1.875g
      'Trà đen Novia':     20 / 2400 * 150,   // 1.25g
      'Bột kem béo':       100 / 2400 * 150,  // 6.25g
      'Sữa đặc':           160 / 2400 * 150,  // 10g
      'Đường đen':         160 / 2400 * 150,  // 10g
      'Rich lùn':          50  / 2400 * 150,  // 3.125ml
      'Trân châu trắng':   50,
      'Trân châu đen':     50,
      'Ống hút lớn':       1,
      'Muỗng':             1,
      'Đá':                1,
      'Túi đựng':          1,
      'Ly nhỏ 500ml':      1,
    },
  },
  // ── Trà Sữa Lớn (bán 25K) ── 200ml cốt trà sữa + 50g TCT + 50g TCD
  {
    names: ['Trà Sữa Lớn', 'Trà sữa lớn', 'tra sua lon', 'Trà sữa 25K'],
    ingredients: {
      'Trà đen hoàng Gia': 30 / 2400 * 200,   // 2.5g
      'Trà đen Novia':     20 / 2400 * 200,   // 1.667g
      'Bột kem béo':       100 / 2400 * 200,  // 8.333g
      'Sữa đặc':           160 / 2400 * 200,  // 13.333g
      'Đường đen':         160 / 2400 * 200,  // 13.333g
      'Rich lùn':          50  / 2400 * 200,  // 4.167ml
      'Trân châu trắng':   50,
      'Trân châu đen':     50,
      'Ống hút lớn':       1,
      'Muỗng':             1,
      'Đá':                1,
      'Túi đựng':          1,
      'Ly lớn 700ml':      1,
    },
  },
  // ── Matcha Nhỏ (bán 28K) ── 110ml sữa tươi + 30g sữa đặc + 10ml nước đường + 50g TCT + 5g matcha
  {
    names: ['Matcha Nhỏ', 'Matcha nhỏ', 'Matcha sữa', 'matcha nho'],
    ingredients: {
      'Sữa tươi':          110,
      'Sữa đặc':           30,
      'Đường trắng':       1000 / 1200 * 10,   // 8.333g từ 10ml nước đường
      'Trân châu trắng':   50,
      'Bột matcha':        5,
      'Ống hút lớn':       1,
      'Muỗng':             1,
      'Đá':                1,
      'Túi đựng':          1,
      'Ly nhỏ 500ml':      1,
    },
  },
  // ── Matcha Lớn (bán 32K) ── 170ml sữa tươi + 50g sữa đặc + 10ml nước đường + 50g TCT + 5g matcha
  {
    names: ['Matcha Lớn', 'Matcha lớn', 'Matcha đá', 'matcha lon'],
    ingredients: {
      'Sữa tươi':          170,
      'Sữa đặc':           50,
      'Đường trắng':       1000 / 1200 * 10,
      'Trân châu trắng':   50,
      'Bột matcha':        5,
      'Ống hút lớn':       1,
      'Muỗng':             1,
      'Đá':                1,
      'Túi đựng':          1,
      'Ly lớn 700ml':      1,
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })

    const storeId = user.store_id

    // ── Upsert materials theo store ────────────────────────────────────────
    const materialIds: Record<string, number> = {}

    for (const m of MATERIALS) {
      const existing = await sql`
        SELECT id FROM materials WHERE LOWER(TRIM(name)) = LOWER(TRIM(${m.name})) AND store_id = ${storeId} LIMIT 1
      `
      if (existing.length > 0) {
        await sql`
          UPDATE materials
          SET price_per_unit = ${m.price_per_unit},
              price_note = ${m.price_note},
              unit = ${m.unit},
              min_quantity = ${m.min_quantity}
          WHERE id = ${existing[0].id} AND store_id = ${storeId}
        `
        materialIds[m.name] = existing[0].id
      } else {
        const [row] = await sql`
          INSERT INTO materials (store_id, name, unit, quantity, min_quantity, price_per_unit, price_note)
          VALUES (${storeId}, ${m.name}, ${m.unit}, 0, ${m.min_quantity}, ${m.price_per_unit}, ${m.price_note})
          RETURNING id
        `
        materialIds[m.name] = row.id
      }
    }

    // ── Link product recipes theo store ────────────────────────────────────
    const recipeResults: { recipe: string; product_id?: number; product_name?: string; status: string; linked?: number }[] = []

    for (const recipe of RECIPES) {
      let found: { id: number; name: string } | null = null

      for (const alias of recipe.names) {
        const rows = await sql`
          SELECT id, name FROM products
          WHERE store_id = ${storeId} AND LOWER(name) LIKE LOWER(${`%${alias}%`})
          LIMIT 1
        `
        if (rows.length > 0) {
          found = rows[0] as { id: number; name: string }
          break
        }
      }

      if (!found) {
        recipeResults.push({ recipe: recipe.names[0], status: 'not_found' })
        continue
      }

      let linked = 0
      for (const [matName, qty] of Object.entries(recipe.ingredients)) {
        const matId = materialIds[matName]
        if (!matId) continue
        await sql`
          INSERT INTO product_ingredients (product_id, material_id, quantity_per_cup)
          VALUES (${found.id}, ${matId}, ${qty})
          ON CONFLICT (product_id, material_id)
          DO UPDATE SET quantity_per_cup = EXCLUDED.quantity_per_cup
        `
        linked++
      }

      recipeResults.push({
        recipe: recipe.names[0],
        product_id: found.id,
        product_name: found.name,
        status: 'ok',
        linked,
      })
    }

    return NextResponse.json({
      success: true,
      materials_synced: MATERIALS.length,
      recipe_results: recipeResults,
    })
  } catch (e) {
    console.error('[seed]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
