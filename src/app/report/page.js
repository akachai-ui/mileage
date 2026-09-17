"use client";

import { useState, useEffect } from 'react';
import { getTripsForReport } from '@/lib/mileageService';
import Link from 'next/link';

export default function ReportPage() {
  const [trips, setTrips] = useState([]);
  const [licensePlate, setLicensePlate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchedPlate, setSearchedPlate] = useState("");
  const [searchedDateRange, setSearchedDateRange] = useState({ start: "", end: "" });

  // อ่านค่าทะเบียนรถจาก LocalStorage (ถ้าเซลส์ล็อกอินอยู่) เพื่อความสะดวก
  useEffect(() => {
    const savedPlate = localStorage.getItem("mileage_user_plate");
    if (savedPlate) {
      setLicensePlate(savedPlate);
      // ถ้าอยากให้โหลดอัตโนมัติ ให้ตัดคอมเมนต์บรรทัดล่างออก
      // handleSearch(savedPlate); 
    }
  }, []);

  const handleSearch = async (plateToSearch) => {
    const targetPlate = plateToSearch || licensePlate;
    if (!targetPlate) return;
    
    setIsLoading(true);
    const data = await getTripsForReport(targetPlate, startDate, endDate);
    setTrips(data);
    setSearchedPlate(targetPlate);
    setSearchedDateRange({ start: startDate, end: endDate });
    setIsLoading(false);
  };

  // Helper สำหรับแปลงเวลา
  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    let d;
    if (timestamp instanceof Date) {
      d = timestamp;
    } else if (typeof timestamp.toDate === 'function') {
      d = timestamp.toDate();
    } else {
      d = new Date(timestamp);
    }
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    let d;
    if (timestamp instanceof Date) {
      d = timestamp;
    } else if (typeof timestamp.toDate === 'function') {
      d = timestamp.toDate();
    } else {
      d = new Date(timestamp);
    }
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // คำนวณสรุปยอด
  const totalDistance = trips.reduce((sum, trip) => {
    const start = Number(trip.start_trip?.mileage_number) || 0;
    const end = Number(trip.end_trip?.mileage_number) || 0;
    const dist = end > start ? end - start : 0;
    return sum + dist;
  }, 0);
  
  const totalExpenses = trips.reduce((sum, trip) => {
    const tripExp = trip.expenses.reduce((subSum, exp) => subSum + (exp.amount || 0), 0);
    return sum + tripExp;
  }, 0);

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 font-sans text-gray-800">
      
      {/* ส่วนค้นหาและปุ่มควบคุม (ซ่อนตอนพิมพ์) */}
      <div className="print:hidden mb-8 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📄 ดึงรายงานเบิกจ่าย <span className="text-gray-500 font-normal text-lg">(Fetch Report)</span></h1>
          </div>
          <Link href="/" className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 border">
            กลับหน้าแรก (Back)
          </Link>
        </div>
        <div className="flex flex-wrap gap-4 items-end bg-gray-50 p-4 rounded-lg">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-1">ทะเบียนรถ <span className="font-normal text-gray-500">(License Plate)</span></label>
            <input 
              type="text" 
              placeholder="เช่น 1กข 1234" 
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" 
              value={licensePlate} 
              onChange={e => setLicensePlate(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ตั้งแต่วันที่ <span className="font-normal text-gray-500">(Start)</span></label>
            <input 
              type="date" 
              className="p-2 border border-gray-300 rounded-md w-full" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ถึงวันที่ <span className="font-normal text-gray-500">(End)</span></label>
            <input 
              type="date" 
              className="p-2 border border-gray-300 rounded-md w-full" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          <button onClick={() => handleSearch()} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold h-[42px] transition">
            ค้นหา (Search)
          </button>
          <button onClick={() => window.print()} className="bg-emerald-600 text-white px-6 py-2 rounded-md hover:bg-emerald-700 font-semibold h-[42px] transition shadow-sm" disabled={trips.length === 0}>
            🖨️ พิมพ์เอกสาร (Print)
          </button>
        </div>
      </div>

      {/* แบบฟอร์มเอกสาร (จะแสดงผลให้สวยงามเวลาพิมพ์) */}
      {searchedPlate && (
        <div className="bg-white p-4 md:p-10 rounded-xl shadow-md border border-gray-200 print:shadow-none print:border-none print:p-0">
          
          <div className="text-center mb-10 border-b-2 border-gray-800 pb-6">
            <h1 className="text-3xl font-bold uppercase tracking-wider mb-1 text-gray-900">Travel & Expense Report</h1>
            <h2 className="text-lg text-gray-500 mb-6">ใบสรุปค่าเดินทางและค่าใช้จ่าย</h2>
            <div className="inline-block bg-gray-50 px-8 py-3 rounded-lg text-lg border border-gray-200 shadow-sm">
              ทะเบียนรถ <span className="text-gray-500 text-sm">(License Plate)</span>: <span className="font-bold text-blue-700 text-xl ml-2">{searchedPlate}</span>
            </div>
            {(searchedDateRange.start || searchedDateRange.end) && (
              <p className="mt-4 text-sm text-gray-600 font-medium">
                รอบบิล <span className="text-gray-400">(Period)</span>: {searchedDateRange.start ? formatDate(new Date(searchedDateRange.start)) : 'เริ่มต้น'} 
                {" - "} 
                {searchedDateRange.end ? formatDate(new Date(searchedDateRange.end)) : 'ปัจจุบัน'}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500 text-lg">ไม่พบประวัติการเดินทางที่เสร็จสมบูรณ์</p>
              <p className="text-gray-400 text-sm mt-1">(No completed trips found for this period)</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto mb-10">
                <table className="w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100 text-gray-800">
                    <tr>
                      <th className="border border-gray-300 p-3 w-[15%]">
                        <div className="font-bold">วันที่</div>
                        <div className="text-xs font-normal text-gray-500">(Date)</div>
                      </th>
                      <th className="border border-gray-300 p-3 w-[15%]">
                        <div className="font-bold">เวลาเดินทาง</div>
                        <div className="text-xs font-normal text-gray-500">(Time)</div>
                      </th>
                      <th className="border border-gray-300 p-3 w-[15%]">
                        <div className="font-bold">ระยะทาง</div>
                        <div className="text-xs font-normal text-gray-500">(Distance - km)</div>
                      </th>
                      <th className="border border-gray-300 p-3 w-[25%]">
                        <div className="font-bold">ไมล์เริ่ม - จบ</div>
                        <div className="text-xs font-normal text-gray-500">(Odometer)</div>
                      </th>
                      <th className="border border-gray-300 p-3 w-[30%]">
                        <div className="font-bold">ค่าใช้จ่ายเพิ่มเติม</div>
                        <div className="text-xs font-normal text-gray-500">(Additional - THB)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => {
                      const tripExpenseTotal = trip.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                      const startM = Number(trip.start_trip?.mileage_number) || 0;
                      const endM = Number(trip.end_trip?.mileage_number) || 0;
                      const calculatedDist = endM > startM ? endM - startM : 0;
                      
                      return (
                        <tr key={trip.id} className="text-center hover:bg-gray-50 transition">
                          <td className="border border-gray-300 p-3 font-medium text-gray-700">{formatDate(trip.start_trip?.time)}</td>
                          <td className="border border-gray-300 p-3 text-xs text-gray-600">
                            {formatTime(trip.start_trip?.time)} - {formatTime(trip.end_trip?.time)}
                          </td>
                          <td className="border border-gray-300 p-3 font-bold text-blue-700 text-lg">{calculatedDist}</td>
                          <td className="border border-gray-300 p-3 text-sm text-gray-600">
                            <span className="inline-block bg-gray-100 px-2 py-1 rounded">{trip.start_trip?.mileage_number}</span>
                            <span className="mx-2 text-gray-400">➡</span>
                            <span className="inline-block bg-gray-100 px-2 py-1 rounded">{trip.end_trip?.mileage_number}</span>
                          </td>
                          <td className="border border-gray-300 p-3">
                            {tripExpenseTotal > 0 ? (
                              <div className="text-left text-sm bg-gray-50 p-2 rounded border border-gray-200">
                                <span className="font-bold text-base block mb-1 text-center text-red-600">{tripExpenseTotal.toLocaleString()} ฿</span>
                                <ul className="space-y-1 mt-2">
                                {trip.expenses.map((e, idx) => {
                                  const expenseName = e.type === 'toll' ? 'ทางด่วน (Toll)' : e.type === 'parking' ? 'ที่จอดรถ (Parking)' : 'รับรอง (Ent.)';
                                  return (
                                    <li key={idx} className="text-gray-700 text-xs flex justify-between">
                                      <span>- {expenseName} {e.description && <span className="text-gray-500 italic">[{e.description}]</span>}</span>
                                      <span className="font-semibold">{e.amount}</span>
                                    </li>
                                  );
                                })}
                                </ul>
                              </div>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* สรุปยอดเบิกจ่าย (หน้า 1) */}
              <div className="flex justify-end mb-16">
                <div className="w-full md:w-[480px] shrink-0 border-2 border-gray-800 p-6 bg-gray-50 rounded-lg shadow-sm">
                  <h3 className="font-bold text-lg mb-5 border-b border-gray-300 pb-3 text-center text-gray-800">
                    สรุปยอดเบิกจ่าย <span className="text-sm font-normal text-gray-500 block">(Reimbursement Summary)</span>
                  </h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="font-semibold text-gray-800">1. รวมระยะทางเดินทาง</div>
                        <div className="text-xs text-gray-500">(Total Distance)</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-blue-700">{totalDistance}</span> <span className="text-gray-600">กม. (km)</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="font-semibold text-gray-800">2. รวมค่าใช้จ่ายเพิ่มเติม</div>
                        <div className="text-xs text-gray-500">(Total Additional Expenses)</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-red-600">{totalExpenses.toLocaleString()}</span> <span className="text-gray-600">บาท (THB)</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-3">
                      <div>
                        <div className="font-semibold text-gray-800">3. อัตราเบิกจ่ายค่าน้ำมัน</div>
                        <div className="text-xs text-gray-500">(Mileage Rate)</div>
                      </div>
                      <div className="text-gray-400 font-mono tracking-widest text-right">
                        ................... <span className="font-sans text-gray-600 tracking-normal">บาท/กม.</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div>
                        <div className="font-semibold text-gray-800">4. รวมค่าน้ำมัน <span className="text-xs font-normal text-gray-500">(ข้อ 1 x ข้อ 3)</span></div>
                        <div className="text-xs text-gray-500">(Total Mileage Cost)</div>
                      </div>
                      <div className="text-gray-400 font-mono tracking-widest text-right">
                        ......................... <span className="font-sans text-gray-600 tracking-normal">บาท</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-gray-800 pt-4 mt-3">
                      <div>
                        <div className="font-bold text-base text-gray-900">รวมยอดเบิกจ่ายสุทธิ</div>
                        <div className="text-xs text-gray-600">(Grand Total)</div>
                      </div>
                      <div className="text-gray-400 font-mono tracking-widest text-right font-bold text-xl">
                        ......................... <span className="font-sans text-gray-800 tracking-normal text-base">บาท (THB)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ช่องเซ็นชื่อ (แสดงตอนพิมพ์ - หน้า 1) */}
              <div className="flex flex-col md:flex-row justify-between mt-12 pt-10 border-t border-gray-300 px-4 md:px-12 gap-10">
                <div className="text-center w-full md:w-1/2">
                  <p className="mb-8 text-gray-400">......................................................................</p>
                  <p className="font-semibold text-gray-800">(ผู้ขอเบิก / Requester)</p>
                  <p className="text-sm mt-2 text-gray-600">วันที่ <span className="text-xs">(Date)</span>: ....../....../..........</p>
                </div>
                <div className="text-center w-full md:w-1/2">
                  <p className="mb-8 text-gray-400">......................................................................</p>
                  <p className="font-semibold text-gray-800">(ผู้อนุมัติ / Approver)</p>
                  <p className="text-sm mt-2 text-gray-600">วันที่ <span className="text-xs">(Date)</span>: ....../....../..........</p>
                </div>
              </div>

              {/* หน้า 2: รวมรูปหลักฐาน (ปัดขึ้นหน้าใหม่ตอนพิมพ์) */}
              <div className="print:break-before-page mt-24 pt-10 print:pt-0 print:mt-0 border-t print:border-none">
                <div className="text-center mb-10 border-b-2 border-gray-800 pb-4">
                  <h3 className="text-2xl font-bold uppercase tracking-wider mb-2 text-gray-900">Evidence & Attachments</h3>
                  <h4 className="text-lg text-gray-500">📸 รวมหลักฐานประกอบการเบิกจ่าย</h4>
                </div>
                <div className="flex flex-col gap-10">
                  {trips.map((trip) => {
                    const hasStart = trip.start_trip?.mileage_image_url?.startsWith('http');
                    const hasEnd = trip.end_trip?.mileage_image_url?.startsWith('http');
                    const hasExpense = trip.expenses.some(e => e.receipt_image_url?.startsWith('http'));
                    
                    if (!hasStart && !hasEnd && !hasExpense) return null;

                    return (
                      <div key={`img-${trip.id}`} className="border border-gray-200 p-6 rounded-lg shadow-sm bg-white break-inside-avoid">
                        <div className="border-b border-gray-200 pb-3 mb-6 flex justify-between items-center">
                          <p className="font-bold text-gray-800 text-lg">
                            📅 วันที่ <span className="text-gray-500 font-normal text-sm">(Date)</span>: {formatDate(trip.start_trip?.time)}
                          </p>
                          <p className="text-gray-500 text-sm">Trip ID: {trip.id.substring(0, 8)}</p>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          {hasStart && (
                            <div className="flex-1 min-w-[250px] flex flex-col items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <span className="text-base font-bold text-gray-700 mb-1">ไมล์เริ่ม</span>
                              <span className="text-xs text-gray-500 mb-3">(Start Odometer)</span>
                              <a href={trip.start_trip.mileage_image_url} target="_blank" rel="noreferrer" className="w-full block">
                                <img src={trip.start_trip.mileage_image_url} alt="เริ่ม" className="w-full h-[300px] print:h-[450px] object-contain border border-gray-300 rounded bg-white shadow-sm" />
                              </a>
                            </div>
                          )}
                          {hasEnd && (
                            <div className="flex-1 min-w-[250px] flex flex-col items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <span className="text-base font-bold text-gray-700 mb-1">ไมล์จบ</span>
                              <span className="text-xs text-gray-500 mb-3">(End Odometer)</span>
                              <a href={trip.end_trip.mileage_image_url} target="_blank" rel="noreferrer" className="w-full block">
                                <img src={trip.end_trip.mileage_image_url} alt="จบ" className="w-full h-[300px] print:h-[450px] object-contain border border-gray-300 rounded bg-white shadow-sm" />
                              </a>
                            </div>
                          )}
                          {trip.expenses.map((e, idx) => e.receipt_image_url && e.receipt_image_url.startsWith('http') ? (
                            <div key={idx} className="flex-1 min-w-[250px] flex flex-col items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <span className="text-base font-bold text-gray-700 mb-1">
                                ใบเสร็จ: {e.type === 'toll' ? 'ทางด่วน' : e.type === 'parking' ? 'ที่จอดรถ' : 'รับรอง'}
                              </span>
                              <span className="text-xs text-gray-500 mb-3">
                                (Receipt: {e.type === 'toll' ? 'Toll' : e.type === 'parking' ? 'Parking' : 'Entertainment'})
                              </span>
                              <a href={e.receipt_image_url} target="_blank" rel="noreferrer" className="w-full block">
                                <img src={e.receipt_image_url} alt="ใบเสร็จ" className="w-full h-[300px] print:h-[450px] object-contain border border-gray-300 rounded bg-white shadow-sm" />
                              </a>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </>
          )}
        </div>
      )}
    </main>
  );
}
