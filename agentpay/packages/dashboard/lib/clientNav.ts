// true setelah hydration pertama selesai. Dipakai untuk membedakan load awal
// (render harus identik dengan HTML server) dari navigasi client berikutnya.
export const clientNav = { hydrated: false };
