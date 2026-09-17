"use client";

import { useState, useEffect } from 'react';
import { registerVehicle, getAllUsers } from '@/lib/mileageService';
import Link from 'next/link';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [licensePlate, setLicensePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // โหลดรายชื่อผู้ใช้งานทั้งหมด
  const fetchUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!licensePlate || !driverName) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }
    
    setStatusMsg("กำลังบันทึกข้อมูล...");
    try {
      await registerVehicle(licensePlate, driverName);
      setStatusMsg("เพิ่มผู้ใช้งานสำเร็จ!");
      setLicensePlate("");
      setDriverName("");
      fetchUsers(); // โหลดข้อมูลใหม่
    } catch (error) {
      setStatusMsg("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  return (
    <main className="max-w-2xl mx-auto p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">⚙️ จัดการข้อมูลผู้ใช้ (Admin)</h1>
        <Link href="/" className="text-sm bg-blue-100 text-blue-700 px-3 py-2 rounded hover:bg-blue-200 font-medium">
          กลับหน้าแรก
        </Link>
      </div>

      {/* ฟอร์มเพิ่มผู้ใช้ */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8 text-black">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">เพิ่มรายชื่อรถและเซลส์</h2>
        <form onSubmit={handleRegister} className="flex flex-col sm:flex-row gap-3">
          <input 
            type="text" 
            placeholder="ทะเบียนรถ (เช่น 1กข 1234)" 
            className="flex-1 p-2 border rounded" 
            value={licensePlate} 
            onChange={e => setLicensePlate(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="ชื่อ-นามสกุล คนขับ" 
            className="flex-1 p-2 border rounded" 
            value={driverName} 
            onChange={e => setDriverName(e.target.value)} 
          />
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            บันทึก
          </button>
        </form>
        {statusMsg && <p className="text-sm text-green-600 mt-3">{statusMsg}</p>}
      </div>

      {/* รายชื่อผู้ใช้งาน */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden text-black">
        <h2 className="text-lg font-semibold p-4 bg-gray-50 border-b text-gray-700">รายชื่อในระบบ ({users.length} คัน)</h2>
        
        {isLoading ? (
          <p className="p-6 text-center text-gray-500">กำลังโหลด...</p>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-gray-500">ยังไม่มีข้อมูลในระบบ</p>
        ) : (
          <ul className="divide-y">
            {users.map((user) => (
              <li key={user.license_plate} className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <p className="font-bold text-lg text-gray-800">{user.license_plate}</p>
                  <p className="text-sm text-gray-600">{user.driver_name}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
