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
    <main className="max-w-md mx-auto h-screen bg-slate-50 sm:shadow-[0_0_40px_rgba(0,0,0,0.1)] sm:border-x sm:border-slate-200 relative flex flex-col font-sans text-slate-800 overflow-hidden">
      
      {/* Mobile App Bar */}
      <header className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex justify-between items-center z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 p-1 flex-shrink-0">
            <img src="/mileage.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Admin Console</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">User Management</p>
          </div>
        </div>
        <Link href="/" className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-bold hover:bg-slate-200 transition">
          ← กลับ
        </Link>
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-24 pb-12 px-5 space-y-6">
        
        {/* ฟอร์มเพิ่มผู้ใช้ */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">➕</div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">ลงทะเบียนรถใหม่</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Register Vehicle</p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">
                ทะเบียนรถ (License Plate)
              </label>
              <input 
                type="text" 
                placeholder="เช่น 1กข 1234" 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 transition-all text-sm" 
                value={licensePlate} 
                onChange={e => setLicensePlate(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 ml-1">
                ชื่อ-นามสกุล คนขับ (Driver Name)
              </label>
              <input 
                type="text" 
                placeholder="เช่น นายสมชาย ใจดี" 
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 transition-all text-sm" 
                value={driverName} 
                onChange={e => setDriverName(e.target.value)} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white p-3.5 rounded-2xl font-bold text-sm active:scale-95 transition-transform shadow-md shadow-slate-900/10 hover:bg-slate-800"
            >
              + บันทึกข้อมูล (Save)
            </button>
          </form>

          {statusMsg && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl text-center">
              {statusMsg}
            </div>
          )}
        </div>

        {/* รายชื่อผู้ใช้งาน */}
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">รายชื่อในระบบ</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Fleet</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-black rounded-full">
              {users.length} คัน
            </span>
          </div>
          
          {isLoading ? (
            <p className="py-8 text-center text-slate-400 text-sm font-medium animate-pulse">กำลังโหลด...</p>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm">ยังไม่มีข้อมูลในระบบ</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.license_plate} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-xl shadow-xs flex items-center justify-center text-lg border border-slate-100">
                      🚘
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm tracking-tight">{user.license_plate}</p>
                      <p className="text-xs text-slate-500 font-medium">👤 {user.driver_name}</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                    Active
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
