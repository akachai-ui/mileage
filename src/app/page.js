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
    <main className="max-w-xl mx-auto p-6 font-sans pb-16">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">🚗 บันทึกการเดินทาง</h1>
        <div className="flex gap-2">
          {currentUser && (
            <Link href="/report" className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200">
              ทำเรื่องเบิก
            </Link>
          )}
          {!currentUser && (
            <Link href="/admin" className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300">
              ตั้งค่าผู้ใช้
            </Link>
          )}
        </div>
      </div>
      
      {statusMsg && (
        <div className="bg-blue-100 text-blue-800 p-3 rounded-md mb-6 text-center text-sm font-medium">
          {statusMsg}
        </div>
      )}

      {!currentUser ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 text-black">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">เข้าสู่ระบบ</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">เลขทะเบียนรถ</label>
              <input type="text" placeholder="เช่น 1กข 1234" className="w-full p-3 border rounded text-lg text-center font-bold" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
            </div>
            <button onClick={handleLogin} disabled={isProcessing} className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50">
              เข้าสู่ระบบ
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gray-100 p-4 rounded-lg shadow-inner flex justify-between items-center mb-6 text-black">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">ผู้ขับขี่ปัจจุบัน</p>
              <p className="font-bold text-gray-800 text-lg">{currentUser.license_plate}</p>
              <p className="text-sm text-gray-700">{currentUser.driver_name}</p>
            </div>
            <button onClick={handleLogout} className="bg-white border border-red-500 text-red-500 px-3 py-1 text-sm rounded hover:bg-red-50">
              เปลี่ยนรถ
            </button>
          </div>

          {!currentTripId ? (
            <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 text-black">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">1. เริ่มทริป</h2>
              <div className="space-y-4">
                <input type="number" placeholder="เลขไมล์เริ่มต้น (ตัวเลขเท่านั้น)" className="w-full p-2 border rounded" value={startMileage} onChange={e => setStartMileage(e.target.value)} />
                
                <div className="border border-dashed border-gray-300 p-4 rounded bg-gray-50 text-center">
                  <label className="block text-sm font-medium text-gray-700 mb-2">📸 ถ่ายรูปหน้าปัดไมล์ (ตอนเริ่ม)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={e => setStartImageFile(e.target.files[0])} 
                    className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 w-full"
                  />
                </div>
                
                <button onClick={handleStartTrip} disabled={isProcessing} className="w-full bg-blue-600 text-white p-3 rounded font-bold hover:bg-blue-700 transition disabled:opacity-50">
                  {isProcessing ? 'กำลังประมวลผล...' : 'เริ่มทริป'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 text-black">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">2. เพิ่มค่าใช้จ่ายระหว่างทาง</h2>
                <div className="space-y-3">
                  <select className="w-full p-2 border rounded bg-white" value={expenseType} onChange={e => setExpenseType(e.target.value)}>
                    <option value="toll">ค่าทางด่วน</option>
                    <option value="parking">ค่าที่จอดรถ</option>
                    <option value="reception">ค่ารับรองลูกค้า</option>
                  </select>
                  <input type="number" placeholder="จำนวนเงิน (บาท)" className="w-full p-2 border rounded" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} />
                  <input type="text" placeholder="รายละเอียดค่าใช้จ่าย" className="w-full p-2 border rounded" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} />
                  
                  <div className="border border-dashed border-gray-300 p-4 rounded bg-gray-50 text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">📸 แนบหลักฐาน (รูปใบเสร็จ)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={e => setExpenseImageFile(e.target.files[0])} 
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 w-full"
                    />
                  </div>

                  <button onClick={handleAddExpense} disabled={isProcessing} className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600 transition disabled:opacity-50">
                    {isProcessing ? 'กำลังประมวลผล...' : 'บันทึกค่าใช้จ่าย'}
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border mb-6 text-black">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">3. จบทริป</h2>
                <div className="space-y-4">
                  <div>
                    <input 
                      type="number" 
                      placeholder={`เลขไมล์ตอนจบ (ต้องมากกว่า ${startMileage})`} 
                      className="w-full p-2 border rounded" 
                      value={endMileage} 
                      onChange={e => setEndMileage(e.target.value)} 
                    />
                    {endMileage && Number(endMileage) < Number(startMileage) && (
                      <p className="text-red-500 text-sm mt-1">⚠️ เลขไมล์ตอนจบต้องมากกว่าหรือเท่ากับเลขไมล์ตอนเริ่ม ({startMileage})</p>
                    )}
                  </div>
                  
                  <div className="border border-dashed border-gray-300 p-4 rounded bg-gray-50 text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-2">📸 ถ่ายรูปหน้าปัดไมล์ (ตอนจบ)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={e => setEndImageFile(e.target.files[0])} 
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 w-full"
                    />
                  </div>

                  <button 
                    onClick={handleEndTrip} 
                    disabled={isProcessing || !endMileage || !endImageFile || Number(endMileage) < Number(startMileage)} 
                    className="w-full bg-red-500 text-white p-3 rounded font-bold hover:bg-red-600 transition disabled:opacity-50 disabled:bg-gray-400"
                  >
                    {isProcessing ? 'กำลังประมวลผล...' : 'จบทริป'}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
