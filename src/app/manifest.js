export default function manifest() {
  return {
    name: 'Sales Mileage Tracker',
    short_name: 'Mileage',
    description: 'ระบบบันทึกการเดินทางฝ่ายขาย',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/mileage.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: '/mileage.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ],
  }
}
