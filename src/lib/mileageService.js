import { collection, addDoc, doc, updateDoc, serverTimestamp, getDoc, setDoc, getDocs, query, where, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

// --- ฟังก์ชันอัปโหลดรูปภาพ ---
export async function uploadImage(file, folderPath) {
  if (!file) return "";
  try {
    const fileExtension = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
    const storageRef = ref(storage, `${folderPath}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการอัปโหลดรูป: ", error);
    throw error;
  }
}

// --- ส่วนจัดการผู้ใช้ (User Management) ---

export async function loginVehicle(licensePlate) {
  try {
    const plateId = licensePlate.trim().replace(/\s+/g, '-').toUpperCase();
    const userRef = doc(db, "users", plateId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return { license_plate: plateId, ...userSnap.data() };
    } else {
      throw new Error("ไม่พบทะเบียนรถนี้ในระบบ กรุณาติดต่อแอดมิน");
    }
  } catch (error) {
    throw error;
  }
}

export async function registerVehicle(licensePlate, driverName) {
  try {
    if (!licensePlate || !driverName) throw new Error("กรุณากรอกข้อมูลให้ครบถ้วน");
    
    const plateId = licensePlate.trim().replace(/\s+/g, '-').toUpperCase();
    const userRef = doc(db, "users", plateId);
    
    const newUser = {
      driver_name: driverName,
      created_at: serverTimestamp()
    };
    
    await setDoc(userRef, newUser);
    return { license_plate: plateId, ...newUser };
  } catch (error) {
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    return usersSnap.docs.map(doc => ({
      license_plate: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// --- ส่วนจัดการทริป (Trip Management) ---

// ตรวจสอบทริปที่ยังไม่จบของรถคันนี้
export async function getActiveTrip(licensePlate) {
  try {
    const q = query(
      collection(db, "trips"),
      where("license_plate", "==", licensePlate),
      where("status", "==", "ongoing"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching active trip:", error);
    return null;
  }
}

export async function startTrip(licensePlate, startMileage, imageUrl = "") {
  try {
    const tripRef = await addDoc(collection(db, "trips"), {
      license_plate: licensePlate,
      status: "ongoing",
      total_distance: 0,
      start_trip: {
        mileage_number: startMileage,
        mileage_image_url: imageUrl,
        time: serverTimestamp()
      }
    });
    return tripRef.id;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการเริ่มทริป: ", error);
    throw error;
  }
}

export async function endTrip(tripId, endMileage, totalDistance, imageUrl = "") {
  try {
    const tripRef = doc(db, "trips", tripId);
    await updateDoc(tripRef, {
      status: "completed",
      total_distance: totalDistance,
      end_trip: {
        mileage_number: endMileage,
        mileage_image_url: imageUrl,
        time: serverTimestamp()
      }
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการจบทริป: ", error);
    throw error;
  }
}

export async function addExpense(tripId, expenseType, amount, description, receiptImageUrl = "") {
  try {
    const expensesRef = collection(db, "trips", tripId, "expenses");
    const expenseDoc = await addDoc(expensesRef, {
      type: expenseType,
      amount: amount,
      description: description,
      receipt_image_url: receiptImageUrl,
      time: serverTimestamp()
    });
    return expenseDoc.id;
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการบันทึกค่าใช้จ่าย: ", error);
    throw error;
  }
}

// --- ส่วนจัดการรายงาน (Reporting) ---

export async function getTripsForReport(licensePlate, startDateStr = "", endDateStr = "") {
  try {
    const q = query(
      collection(db, "trips"),
      where("license_plate", "==", licensePlate),
      where("status", "==", "completed")
    );
    const tripSnaps = await getDocs(q);
    let trips = [];
    
    // แปลงวันที่จาก string เป็น Date object สำหรับเปรียบเทียบ
    let startD = null, endD = null;
    if (startDateStr) {
      startD = new Date(startDateStr);
      startD.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      endD = new Date(endDateStr);
      endD.setHours(23, 59, 59, 999);
    }
    
    for (const docSnap of tripSnaps.docs) {
      const tripData = docSnap.data();
      
      // กรองตามวันที่ (ถ้ามีการระบุ)
      const tripDate = tripData.start_trip?.time?.toDate();
      if (tripDate) {
        if (startD && tripDate < startD) continue;
        if (endD && tripDate > endD) continue;
      }

      // ค้นหาค่าใช้จ่ายที่ผูกกับทริปนี้
      const expQ = collection(db, "trips", docSnap.id, "expenses");
      const expSnaps = await getDocs(expQ);
      const expenses = expSnaps.docs.map(e => e.data());
      
      trips.push({
        id: docSnap.id,
        ...tripData,
        expenses: expenses
      });
    }
    
    // เรียงลำดับจากทริปล่าสุดไปเก่าสุด
    trips.sort((a, b) => {
      const timeA = a.start_trip?.time?.toMillis() || 0;
      const timeB = b.start_trip?.time?.toMillis() || 0;
      return timeB - timeA;
    });
    
    return trips;
  } catch (error) {
    console.error("Error fetching report data: ", error);
    return [];
  }
}
