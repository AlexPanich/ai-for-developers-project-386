import { BrowserRouter, Route, Routes } from 'react-router'
import { AdminPage } from '@/pages/admin-page'
import { HomePage } from '@/pages/home-page'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
