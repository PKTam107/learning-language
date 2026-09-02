
/**
 * Số dòng mỗi trang. Supabase đặt sẵn **"Max rows" = 1000** cho project mới
 * (Dashboard → Settings → API), nên mọi `select()` không phân trang đều bị
 * **cắt im lặng ở 1000 dòng** — không lỗi, không cảnh báo, chỉ thiếu dữ liệu.
 */
export const PAGE_SIZE = 1000;

/** Chặn vòng lặp vô hạn nếu server trả trang đầy mãi không hết. */
const MAX_PAGES = 200;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Nạp **toàn bộ** dòng của một truy vấn bằng cách lặp `.range()` cho tới trang
 * cuối.
 *
 * ⚠️ Truy vấn truyền vào **phải có `ORDER BY` cố định** (khóa duy nhất ở cuối,
 * vd `.order("id")`). Không có thứ tự xác định thì hai trang liên tiếp có thể
 * trả trùng dòng hoặc bỏ sót dòng — Postgres không hứa giữ thứ tự giữa các
 * truy vấn khác nhau.
 *
 * ```ts
 * const rows = await fetchAllRows((from, to) =>
 *   sb.from("cards").select("id, deck_id").order("id").range(from, to)
 * );
 * ```
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const out: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    // Trang không đầy ⇒ đã hết dữ liệu.
    if (rows.length < PAGE_SIZE) return out;
  }
  return out;
}
