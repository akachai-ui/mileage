"use client";

import { useState, useEffect } from 'react';
import { loginVehicle, startTrip, endTrip, addExpense, uploadImage, getActiveTrip } from '@/lib/mileageService';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';

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
      
      {/* Unified App Bar */}
      <AppHeader 
        title="Mileage" 
        subtitle="Tracker App" 
        rightAction={
          currentUser ? (
            <button onClick={handleLogout} className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-full text-xs font-bold transition flex items-center gap-1 border border-slate-200">
              🚪 ออก
            </button>
          ) : (
            <Link href="/admin" className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-200 transition border border-slate-200 text-sm">
              ⚙️
            </Link>
          )
        } 
      />

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pt-6 pb-28 px-5">
        
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2rem] p-6 text-white shadow-xl shadow-slate-900/15 relative overflow-hidden border border-slate-700/50">
              <div className="absolute -right-6 -top-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="relative z-10 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <p className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Active Vehicle</p>
                  </div>
                  <p className="text-3xl font-black tracking-tight mb-1">{currentUser.license_plate}</p>
                  <p className="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                    <span>👤</span> {currentUser.driver_name}
                  </p>
                </div>
                {currentTripId && (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black rounded-full uppercase tracking-wider">
                    กำลังเดินทาง
                  </span>
                )}
              </div>
            </div>

            {!currentTripId ? (
              /* 1. Start Trip */
              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80">
                <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs">1</div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 leading-tight">เริ่มทริปใหม่</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Start Mileage Log</p>
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2 ml-1">
                      🔢 เลขไมล์ตอนเริ่ม (Start Odometer)
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="กรอกเลขไมล์บนหน้าปัด" 
                        className="w-full p-4 pr-14 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-black text-xl text-slate-800 transition-all" 
                        value={startMileage} 
                        onChange={e => setStartMileage(e.target.value)} 
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        km
                      </span>
                    </div>
                  </div>
                  
                  {startImageFile ? (
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-indigo-500 bg-slate-900 shadow-md">
                      <img 
                        src={URL.createObjectURL(startImageFile)} 
                        alt="Preview" 
                        className="w-full h-44 object-cover opacity-90 group-hover:opacity-100 transition" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-4">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>✅</span> บันทึกรูปหน้าปัดแล้ว
                        </span>
                        <button 
                          onClick={() => setStartImageFile(null)} 
                          className="px-3 py-1 bg-white/20 hover:bg-rose-600 text-white rounded-lg text-xs font-bold backdrop-blur-md transition"
                        >
                          ถ่ายใหม่
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl text-indigo-600 font-bold active:scale-[0.99] transition cursor-pointer">
                      <span className="text-3xl mb-1">📸</span>
                      <span className="text-sm font-black">แตะเพื่อถ่ายรูปหน้าปัดไมล์</span>
                      <span className="text-[10px] text-indigo-400 font-semibold mt-0.5">(Start Odometer Photo)</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setStartImageFile(e.target.files[0])} />
                    </label>
                  )}

                  <button 
                    onClick={handleStartTrip} 
                    disabled={isProcessing || !startMileage || !startImageFile} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-2xl font-black text-lg active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
                  >
                    <span>{isProcessing ? '⏳' : '🚗'}</span>
                    <span>{isProcessing ? 'กำลังบันทึก...' : 'เริ่มออกเดินทาง (Start Trip)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 2. Expenses */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80">
                  <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs">2</div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 leading-tight">ค่าใช้จ่ายระหว่างทาง</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toll & Parking Expenses</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3.5 bg-slate-50/80 p-4.5 rounded-2xl border border-slate-100">
                    <div className="flex gap-2.5">
                      <select className="flex-1 p-3.5 border border-slate-200 rounded-xl bg-white outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-amber-500 shadow-xs" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                        <option value="toll">🛣️ ทางด่วน</option>
                        <option value="parking">🅿️ ที่จอดรถ</option>
                        <option value="reception">🤝 รับรองลูกค้า</option>
                      </select>
                      <div className="relative w-2/5">
                        <input type="number" placeholder="ยอดเงิน" className="w-full p-3.5 pr-8 border border-slate-200 rounded-xl bg-white outline-none font-black text-amber-700 text-sm focus:ring-2 focus:ring-amber-500 shadow-xs text-right" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">฿</span>
                      </div>
                    </div>
                    
                    <input type="text" placeholder="รายละเอียด เช่น ด่านอโศก (ถ้ามี)" className="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none text-xs font-semibold focus:ring-2 focus:ring-amber-500 shadow-xs" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                    
                    {expenseImageFile ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-amber-500 bg-slate-900 h-28 flex items-center justify-center">
                        <img src={URL.createObjectURL(expenseImageFile)} alt="Receipt" className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-between px-4">
                          <span className="text-xs font-bold text-white">✅ แนบใบเสร็จแล้ว</span>
                          <button onClick={() => setExpenseImageFile(null)} className="px-2.5 py-1 bg-white/20 hover:bg-rose-600 text-white rounded text-[11px] font-bold transition">เปลี่ยน</button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 rounded-xl text-amber-700 font-bold text-xs active:scale-[0.99] transition cursor-pointer">
                        <span className="text-lg">📸</span>
                        <span>แนบรูปใบเสร็จ (Receipt Photo)</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setExpenseImageFile(e.target.files[0])} />
                      </label>
                    )}

                    <button onClick={handleAddExpense} disabled={isProcessing} className="w-full bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-xl font-black text-sm active:scale-95 transition-transform disabled:opacity-50 mt-1 shadow-md shadow-slate-900/10">
                      {isProcessing ? '⏳ กำลังบันทึก...' : '+ บันทึกค่าใช้จ่าย (Add Expense)'}
                    </button>
                  </div>
                </div>

                {/* 3. End Trip */}
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80">
                  <div className="flex items-center gap-3.5 mb-5 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-xs">3</div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 leading-tight">จบทริป</h2>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finish & Calculate</p>
                    </div>
                  </div>
                  
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 ml-1">
                        <label className="text-xs font-bold text-slate-600">
                          🏁 เลขไมล์ตอนจบ (End Odometer)
                        </label>
                        <span className="text-[11px] text-slate-400 font-bold">
                          ไมล์เริ่ม: <span className="text-slate-700 font-black">{startMileage}</span>
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder={`ต้องมากกว่า ${startMileage}`} 
                          className="w-full p-4 pr-14 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-black text-xl text-slate-800 transition-all" 
                          value={endMileage} 
                          onChange={e => setEndMileage(e.target.value)} 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          km
                        </span>
                      </div>

                      {/* Dynamic Live Distance Calculator */}
                      {endMileage && Number(endMileage) >= Number(startMileage) && (
                        <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-black animate-fade-in">
                          <span>✨ ระยะทางในทริปนี้:</span>
                          <span className="text-base text-emerald-700 font-black">
                            +{Number(endMileage) - Number(startMileage)} กม.
                          </span>
                        </div>
                      )}

                      {endMileage && Number(endMileage) < Number(startMileage) && (
                        <p className="text-rose-500 text-xs mt-2 font-black flex items-center gap-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                          <span>⚠️</span> เลขไมล์ตอนจบต้องมากกว่าตอนเริ่ม ({startMileage})
                        </p>
                      )}
                    </div>
                    
                    {endImageFile ? (
                      <div className="relative group rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 shadow-md">
                        <img 
                          src={URL.createObjectURL(endImageFile)} 
                          alt="End Preview" 
                          className="w-full h-44 object-cover opacity-90 group-hover:opacity-100 transition" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-4">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>✅</span> บันทึกรูปหน้าปัดตอนจบแล้ว
                          </span>
                          <button 
                            onClick={() => setEndImageFile(null)} 
                            className="px-3 py-1 bg-white/20 hover:bg-rose-600 text-white rounded-lg text-xs font-bold backdrop-blur-md transition"
                          >
                            ถ่ายใหม่
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl text-emerald-600 font-bold active:scale-[0.99] transition cursor-pointer">
                        <span className="text-3xl mb-1">📸</span>
                        <span className="text-sm font-black">แตะเพื่อถ่ายรูปหน้าปัดไมล์ (ตอนจบ)</span>
                        <span className="text-[10px] text-emerald-500 font-semibold mt-0.5">(End Odometer Photo)</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => setEndImageFile(e.target.files[0])} />
                      </label>
                    )}

                    <button 
                      onClick={handleEndTrip} 
                      disabled={isProcessing || !endMileage || !endImageFile || Number(endMileage) < Number(startMileage)} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-black text-lg active:scale-95 transition-all disabled:opacity-40 disabled:bg-slate-300 disabled:shadow-none disabled:active:scale-100 shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                    >
                      <span>{isProcessing ? '⏳' : '🏁'}</span>
                      <span>{isProcessing ? 'กำลังบันทึกข้อมูล...' : 'บันทึกและจบทริป (Finish Trip)'}</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav />

    </main>
  );
}
