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
    <main className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      <div className="max-w-xl mx-auto p-4 md:p-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-2 overflow-hidden">
              <img src="/mileage.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Mileage Tracker</h1>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Corporate Edition</p>
            </div>
          </div>
          <div className="flex gap-2">
            {currentUser && (
              <Link href="/report" className="text-xs bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-full font-bold hover:bg-indigo-100 transition shadow-sm border border-indigo-100 flex items-center gap-1">
                <span>📄</span> Report
              </Link>
            )}
            {!currentUser && (
              <Link href="/admin" className="text-xs bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-full font-bold hover:bg-slate-50 transition shadow-sm flex items-center gap-1">
                <span>⚙️</span> Admin
              </Link>
            )}
          </div>
        </div>
        
        {/* Status Message */}
        {statusMsg && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-2xl mb-6 text-sm font-medium flex items-start gap-3 shadow-sm">
            <span className="text-lg">ℹ️</span>
            <p className="pt-0.5">{statusMsg}</p>
          </div>
        )}

        {!currentUser ? (
          /* Login Box */
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-sm border border-slate-100 text-center mt-6 relative overflow-hidden">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100">
              <span className="text-4xl">🚘</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">เข้าสู่ระบบ</h2>
            <p className="text-slate-500 text-sm mb-8">กรุณากรอกทะเบียนรถเพื่อเริ่มต้นบันทึกการเดินทาง</p>
            
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="เช่น 1กข 1234" 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-center text-lg font-bold text-slate-800 outline-none" 
                value={licensePlate} 
                onChange={e => setLicensePlate(e.target.value)} 
              />
              <button 
                onClick={handleLogin} 
                disabled={isProcessing} 
                className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20 active:scale-[0.98]"
              >
                {isProcessing ? 'กำลังตรวจสอบ...' : 'เริ่มต้นใช้งาน (Start)'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Profile Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-900/20 flex justify-between items-center relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">ทะเบียนรถปัจจุบัน</p>
                <p className="text-3xl font-bold tracking-tight mb-1">{currentUser.license_plate}</p>
                <p className="text-indigo-200 text-sm font-medium flex items-center gap-2">
                  <span>👤</span> {currentUser.driver_name}
                </p>
              </div>
              <button onClick={handleLogout} className="relative z-10 bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl backdrop-blur-md transition border border-white/10">
                <span className="text-sm font-bold">🚪 ออก</span>
              </button>
            </div>

            {!currentTripId ? (
              /* 1. Start Trip */
              <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl">1</div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">เริ่มทริปใหม่</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Start New Trip</p>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">เลขไมล์ตอนเริ่ม</label>
                    <input 
                      type="number" 
                      placeholder="กรอกตัวเลขไมล์ปัจจุบัน" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-lg transition-all" 
                      value={startMileage} 
                      onChange={e => setStartMileage(e.target.value)} 
                    />
                  </div>
                  
                  <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl bg-slate-50 text-center hover:bg-indigo-50/50 transition cursor-pointer group">
                    <label className="block text-sm font-bold text-slate-700 mb-4 cursor-pointer group-hover:text-indigo-700 transition">
                      📸 ถ่ายรูปหน้าปัดไมล์ (ตอนเริ่ม)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={e => setStartImageFile(e.target.files[0])} 
                      className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer transition shadow-sm"
                    />
                  </div>

                  <button 
                    onClick={handleStartTrip} 
                    disabled={isProcessing} 
                    className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isProcessing ? 'กำลังประมวลผล...' : '🚗 เริ่มเดินทาง (Go)'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 2. Expenses */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-xl">2</div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">ค่าใช้จ่ายระหว่างทาง</h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Additional Expenses</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex gap-3">
                      <select className="flex-1 p-3.5 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold text-slate-700" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                        <option value="toll">🛣️ ทางด่วน</option>
                        <option value="parking">🅿️ ที่จอดรถ</option>
                        <option value="reception">🤝 รับรองลูกค้า</option>
                      </select>
                      <input type="number" placeholder="ยอดเงิน (฿)" className="w-1/3 p-3.5 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-bold text-amber-700" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                    </div>
                    <input type="text" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" className="w-full p-3.5 border border-slate-200 rounded-xl bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none font-medium" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                    
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-500 mb-3">📸 แนบรูปใบเสร็จ</label>
                      <input type="file" accept="image/*" capture="environment" onChange={e => setExpenseImageFile(e.target.files[0])} className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:font-bold file:bg-amber-100 file:text-amber-800 hover:file:bg-amber-200 transition cursor-pointer shadow-sm" />
                    </div>

                    <button onClick={handleAddExpense} disabled={isProcessing} className="w-full bg-slate-800 text-white p-3.5 rounded-xl font-bold hover:bg-slate-900 shadow-md mt-4 transition active:scale-[0.98] disabled:opacity-50">
                      {isProcessing ? 'กำลังประมวลผล...' : '+ เพิ่มค่าใช้จ่าย (Add)'}
                    </button>
                  </div>
                </div>

                {/* 3. End Trip */}
                <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-xl">3</div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">จบทริป</h2>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Finish & Save</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">เลขไมล์ตอนจบ</label>
                      <input 
                        type="number" 
                        placeholder={`ต้องมากกว่า ${startMileage}`} 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-lg font-bold transition-all" 
                        value={endMileage} 
                        onChange={e => setEndMileage(e.target.value)} 
                      />
                      {endMileage && Number(endMileage) < Number(startMileage) && (
                        <p className="text-rose-500 text-sm mt-3 font-bold flex items-center gap-1.5 bg-rose-50 p-3 rounded-xl border border-rose-100 shadow-sm">
                          <span className="text-lg">⚠️</span> เลขไมล์ต้องมากกว่าตอนเริ่ม ({startMileage})
                        </p>
                      )}
                    </div>
                    
                    <div className="border-2 border-dashed border-slate-200 p-6 rounded-2xl bg-slate-50 text-center hover:bg-emerald-50/50 transition cursor-pointer group">
                      <label className="block text-sm font-bold text-slate-700 mb-4 cursor-pointer group-hover:text-emerald-700 transition">📸 ถ่ายรูปหน้าปัดไมล์ (ตอนจบ)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={e => setEndImageFile(e.target.files[0])} 
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer transition shadow-sm"
                      />
                    </div>

                    <button 
                      onClick={handleEndTrip} 
                      disabled={isProcessing || !endMileage || !endImageFile || Number(endMileage) < Number(startMileage)} 
                      className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100"
                    >
                      {isProcessing ? 'กำลังบันทึก...' : '🏁 บันทึกและจบทริป'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
