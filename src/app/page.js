"use client";

import { useState, useEffect } from 'react';
import { loginVehicle, startTrip, endTrip, addExpense, uploadImage, getActiveTrip } from '@/lib/mileageService';
import Link from 'next/link';

export default function Home() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [licensePlate, setLicensePlate] = useState("");
  
  const [currentTripId, setCurrentTripId] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Start Trip State
  const [startMileage, setStartMileage] = useState("");
  const [startImageFile, setStartImageFile] = useState(null);

  // Expense State
  const [expenseType, setExpenseType] = useState("toll");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseImageFile, setExpenseImageFile] = useState(null);

  // End Trip State
  const [endMileage, setEndMileage] = useState("");
  const [endImageFile, setEndImageFile] = useState(null);

  // เช็คทริปที่ค้างอยู่หลังจาก Login
  const checkOngoingTrip = async (plateId) => {
    const activeTrip = await getActiveTrip(plateId);
    if (activeTrip) {
      setCurrentTripId(activeTrip.id);
      // ต้องดึงเลขไมล์เริ่มต้นจากฐานข้อมูลมาใส่ State ด้วย ไม่งั้นมันจะมองว่าเป็น 0
      setStartMileage(activeTrip.start_trip?.mileage_number || "");
      setStatusMsg(`พบทริปที่ยังไม่จบ สามารถบันทึกค่าใช้จ่ายหรือจบทริปต่อได้เลย`);
    } else {
      setCurrentTripId(null);
      setStartMileage("");
    }
  };

  useEffect(() => {
    const savedPlate = localStorage.getItem("mileage_user_plate");
    if (savedPlate) {
      loginVehicle(savedPlate)
        .then(async user => {
          setCurrentUser(user);
          await checkOngoingTrip(user.license_plate);
          setIsCheckingSession(false);
        })
        .catch(() => {
          setIsCheckingSession(false);
          localStorage.removeItem("mileage_user_plate");
        });
    } else {
      setIsCheckingSession(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!licensePlate) {
      alert("กรุณาระบุเลขทะเบียนรถ");
      return;
    }
    setStatusMsg("กำลังตรวจสอบข้อมูลรถ...");
    try {
      const user = await loginVehicle(licensePlate);
      setCurrentUser(user);
      localStorage.setItem("mileage_user_plate", user.license_plate);
      
      setStatusMsg(`เข้าสู่ระบบสำเร็จ: รถทะเบียน ${user.license_plate}`);
      await checkOngoingTrip(user.license_plate);
      
    } catch (e) {
      setStatusMsg(e.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("mileage_user_plate");
    setCurrentUser(null);
    setCurrentTripId(null);
    setLicensePlate("");
    setStatusMsg("ออกจากระบบเรียบร้อย");
  };

  const handleStartTrip = async () => {
    if (!startMileage || !startImageFile) {
      alert("กรุณากรอกเลขไมล์เริ่มต้นและแนบรูปถ่ายหน้าปัดไมล์ให้ครบถ้วน");
      return;
    }
    
    setIsProcessing(true);
    try {
      setStatusMsg("กำลังอัปโหลดรูปภาพ...");
      const imageUrl = await uploadImage(startImageFile, `trips/${currentUser.license_plate}`);
      
      setStatusMsg("กำลังสร้างทริป...");
      const id = await startTrip(currentUser.license_plate, Number(startMileage), imageUrl);
      
      setCurrentTripId(id);
      setStatusMsg(`เริ่มทริปสำเร็จ (Trip ID: ${id})`);
    } catch (e) {
      setStatusMsg("เกิดข้อผิดพลาดในการสร้างทริป");
    }
    setIsProcessing(false);
  };

  const handleAddExpense = async () => {
    if (!expenseAmount) {
      alert("กรุณาระบุจำนวนเงิน");
      return;
    }
    setIsProcessing(true);
    
    try {
      let receiptUrl = "";
      if (expenseImageFile) {
        setStatusMsg("กำลังอัปโหลดรูปหลักฐาน/ใบเสร็จ...");
        receiptUrl = await uploadImage(expenseImageFile, `expenses/${currentUser.license_plate}`);
      }
      
      setStatusMsg("กำลังบันทึกค่าใช้จ่าย...");
      const id = await addExpense(currentTripId, expenseType, Number(expenseAmount), expenseDesc, receiptUrl);
      
      setStatusMsg(`บันทึกค่าใช้จ่ายสำเร็จ (ID: ${id})`);
      setExpenseAmount("");
      setExpenseDesc("");
      setExpenseImageFile(null);
    } catch (e) {
      setStatusMsg("บันทึกค่าใช้จ่ายล้มเหลว");
    }
    setIsProcessing(false);
  };

  const handleEndTrip = async () => {
    if (!endMileage || Number(endMileage) < Number(startMileage) || !endImageFile) {
      alert("เลขไมล์ตอนจบต้องมากกว่าตอนเริ่ม และต้องแนบรูปถ่ายด้วยครับ");
      return;
    }
    
    setIsProcessing(true);
    const totalDist = Number(endMileage) - Number(startMileage);
    
    try {
      setStatusMsg("กำลังอัปโหลดรูปภาพตอนจบ...");
      const imageUrl = await uploadImage(endImageFile, `trips/${currentUser.license_plate}`);
      
      setStatusMsg("กำลังจบทริป...");
      await endTrip(currentTripId, Number(endMileage), totalDist, imageUrl);
      
      setStatusMsg(`จบทริปเรียบร้อย! รถทะเบียน ${currentUser.license_plate} วิ่งไปทั้งหมด ${totalDist} กม.`);
      
      setCurrentTripId(null);
      setStartMileage(endMileage);
      setEndMileage("");
      setStartImageFile(null);
      setEndImageFile(null);
    } catch (e) {
      setStatusMsg("เกิดข้อผิดพลาดในการจบทริป");
    }
    setIsProcessing(false);
  };

  if (isCheckingSession) {
    return (
      <main className="max-w-xl mx-auto p-6 flex justify-center items-center h-screen">
        <p className="text-xl text-gray-500 font-bold animate-pulse">กำลังโหลดข้อมูลผู้ใช้...</p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto h-screen bg-slate-50 sm:shadow-[0_0_40px_rgba(0,0,0,0.1)] sm:border-x sm:border-slate-200 relative flex flex-col font-sans text-slate-800 overflow-hidden">
      
      {/* Mobile App Bar */}
      <header className="absolute top-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-5 py-4 flex justify-between items-center z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 p-1 flex-shrink-0">
            <img src="/mileage.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Mileage</h1>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Tracker App</p>
          </div>
        </div>
        {!currentUser && (
          <Link href="/admin" className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition border border-slate-100">
            ⚙️
          </Link>
        )}
      </header>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-24 pb-28 px-5">
        
        {/* Toast Message */}
        {statusMsg && (
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-2xl mb-5 text-sm font-medium flex items-center gap-2 shadow-sm">
            <span className="text-base">ℹ️</span>
            <p>{statusMsg}</p>
          </div>
        )}

        {!currentUser ? (
          /* Login Screen */
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-4">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🚘</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">เข้าสู่ระบบ</h2>
            <p className="text-slate-500 text-sm mb-8">กรอกทะเบียนรถเพื่อเริ่มใช้งาน</p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="เช่น 1กข 1234" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-center text-xl font-bold text-slate-800 outline-none" 
                value={licensePlate} 
                onChange={e => setLicensePlate(e.target.value)} 
              />
              <button 
                onClick={handleLogin} 
                disabled={isProcessing} 
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-lg active:scale-95 transition-all disabled:opacity-50 shadow-md"
              >
                {isProcessing ? 'กำลังตรวจสอบ...' : 'เริ่มต้น (Start)'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            
            {/* Vehicle Card */}
            <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">พาหนะปัจจุบัน</p>
                <p className="text-3xl font-bold tracking-tight mb-0.5">{currentUser.license_plate}</p>
                <p className="text-indigo-300 text-sm font-medium flex items-center gap-1.5">
                  👤 {currentUser.driver_name}
                </p>
              </div>
            </div>

            {!currentTripId ? (
              /* 1. Start Trip */
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-lg">1</div>
                  <h2 className="text-lg font-bold text-slate-900">เริ่มทริปใหม่</h2>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">เลขไมล์ตอนเริ่ม</label>
                    <input 
                      type="number" 
                      placeholder="000000" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xl transition-all" 
                      value={startMileage} 
                      onChange={e => setStartMileage(e.target.value)} 
                    />
                  </div>
                  
                  {startImageFile ? (
                    <div className="flex items-center justify-center w-full h-24 border-2 border-indigo-500 bg-indigo-50 rounded-2xl text-indigo-700 font-bold text-sm shadow-inner" onClick={() => setStartImageFile(null)}>
                      ✅ เลือกรูปแล้ว (แตะเพื่อเปลี่ยน)
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl text-indigo-600 font-bold active:bg-indigo-100 transition cursor-pointer">
                      <span className="text-2xl mb-1">📸</span>
                      <span className="text-sm">ถ่ายรูปหน้าปัดไมล์</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setStartImageFile(e.target.files[0])} />
                    </label>
                  )}

                  <button 
                    onClick={handleStartTrip} 
                    disabled={isProcessing || !startMileage || !startImageFile} 
                    className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-indigo-200"
                  >
                    {isProcessing ? 'ประมวลผล...' : '🚗 เริ่มเดินทาง'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 2. Expenses */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center font-black text-lg">2</div>
                    <h2 className="text-lg font-bold text-slate-900">ค่าใช้จ่ายระหว่างทาง</h2>
                  </div>
                  
                  <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                    <div className="flex gap-2">
                      <select className="flex-1 p-3 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700 text-sm" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                        <option value="toll">🛣️ ทางด่วน</option>
                        <option value="parking">🅿️ ที่จอดรถ</option>
                        <option value="reception">🤝 รับรอง</option>
                      </select>
                      <input type="number" placeholder="ยอดเงิน" className="w-1/3 p-3 border border-slate-200 rounded-xl bg-white outline-none font-bold text-amber-700 text-sm text-center" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                    </div>
                    <input type="text" placeholder="รายละเอียด (ถ้ามี)" className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none text-sm font-medium" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                    
                    {expenseImageFile ? (
                      <div className="flex items-center justify-center w-full py-3 border-2 border-amber-500 bg-amber-50 rounded-xl text-amber-700 font-bold text-xs" onClick={() => setExpenseImageFile(null)}>
                        ✅ แนบใบเสร็จแล้ว
                      </div>
                    ) : (
                      <label className="flex items-center justify-center w-full py-3 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl text-amber-600 font-bold text-xs active:bg-amber-100 transition cursor-pointer">
                        📸 ถ่ายรูปใบเสร็จ
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setExpenseImageFile(e.target.files[0])} />
                      </label>
                    )}

                    <button onClick={handleAddExpense} disabled={isProcessing} className="w-full bg-slate-800 text-white p-3 rounded-xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-50 mt-1">
                      {isProcessing ? 'รอสักครู่...' : '+ เพิ่มรายการ'}
                    </button>
                  </div>
                </div>

                {/* 3. End Trip */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg">3</div>
                    <h2 className="text-lg font-bold text-slate-900">จบทริป</h2>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1">เลขไมล์ตอนจบ</label>
                      <input 
                        type="number" 
                        placeholder={`> ${startMileage}`} 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xl font-bold transition-all" 
                        value={endMileage} 
                        onChange={e => setEndMileage(e.target.value)} 
                      />
                      {endMileage && Number(endMileage) < Number(startMileage) && (
                        <p className="text-rose-500 text-xs mt-2 font-bold flex items-center gap-1 ml-1">⚠️ ต้องมากกว่าตอนเริ่ม ({startMileage})</p>
                      )}
                    </div>
                    
                    {endImageFile ? (
                      <div className="flex items-center justify-center w-full h-24 border-2 border-emerald-500 bg-emerald-50 rounded-2xl text-emerald-700 font-bold text-sm" onClick={() => setEndImageFile(null)}>
                        ✅ เลือกรูปแล้ว (แตะเพื่อเปลี่ยน)
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-2xl text-emerald-600 font-bold active:bg-emerald-100 transition cursor-pointer">
                        <span className="text-2xl mb-1">📸</span>
                        <span className="text-sm">ถ่ายรูปหน้าปัดไมล์</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setEndImageFile(e.target.files[0])} />
                      </label>
                    )}

                    <button 
                      onClick={handleEndTrip} 
                      disabled={isProcessing || !endMileage || !endImageFile || Number(endMileage) < Number(startMileage)} 
                      className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-lg active:scale-95 transition-transform disabled:opacity-50 disabled:bg-slate-300 disabled:active:scale-100 shadow-md shadow-emerald-200"
                    >
                      {isProcessing ? 'บันทึกข้อมูล...' : '🏁 จบทริป'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      {currentUser && (
        <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 pt-3 pb-6 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <button className="flex flex-col items-center text-indigo-600 transition active:scale-95">
            <span className="text-2xl mb-1">🚗</span>
            <span className="text-[10px] font-bold">บันทึกทริป</span>
          </button>
          <Link href="/report" className="flex flex-col items-center text-slate-400 hover:text-indigo-500 transition active:scale-95">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-[10px] font-bold">รายงาน</span>
          </Link>
          <button onClick={handleLogout} className="flex flex-col items-center text-slate-400 hover:text-rose-500 transition active:scale-95">
            <span className="text-2xl mb-1">🚪</span>
            <span className="text-[10px] font-bold">ออกระบบ</span>
          </button>
        </nav>
      )}

    </main>
  );
}
