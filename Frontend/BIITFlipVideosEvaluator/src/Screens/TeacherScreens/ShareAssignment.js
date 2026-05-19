import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BASE_URL } from '../../config';

export default function ShareAssignment({ route, navigation }) {

  const {
    Assignment_num,
    emp_no,
    course_no,
    semester_no,
    section,
    discipline,
    current_sem
  } = route.params;

  const [topic, setTopic] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [students, setStudents] = useState([]);
  const [assignmentId, setAssignmentId] = useState(null);
  const [sentStudents, setSentStudents] = useState([]);
  const [allSent, setAllSent] = useState(false);

  // ✅ LOAD STUDENTS FIRST
  useEffect(() => {
    fetchStudents();
  }, []);

  // ✅ THEN CHECK STATUS AFTER STUDENTS LOAD
  useEffect(() => {
    if (students.length > 0) {
      checkAssignmentStatus();
    }
  }, [students]);

  // ✅ VALIDATION
  const validateForm = () => {
    if (!topic || topic.trim() === '') {
      Alert.alert("Validation Error", "Topic is required");
      return false;
    }
    return true;
  };

  // ✅ FETCH STUDENTS
  const fetchStudents = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/teacher/get-students-by-course`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emp_no,
            course_no,
            discipline,
            semester_no,
            section,
            current_sem
          }),
        }
      );

      const data = await response.json();

      if (data.students) {
        const formatted = data.students.map((s, index) => ({
          id: index.toString(),
          name: s.name,
          reg_no: s.reg_no,
        }));

        setStudents(formatted);
      }

    } catch (error) {
      Alert.alert("Error", "Failed to load students");
    }
  };

  // ✅ CHECK STATUS (IMPORTANT FIXED QUERY BACKEND)
  const checkAssignmentStatus = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/assignment/check-assignment-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_no,
            semester_no,
            section,
            discipline,
            Assignment_no: parseInt(Assignment_num.split('-')[1]),
            current_sem,
          }),
        }
      );

      const data = await response.json();

      if (data.sent_students) {
        setSentStudents(data.sent_students);

        if (data.sent_students.length === students.length) {
          setAllSent(true);
        }
      }

    } catch (error) {
      console.log(error);
    }
  };

  // ✅ CREATE ASSIGNMENT
  const createAssignment = async () => {
    if (!validateForm()) return;

    try {
      const response = await fetch(
        `${BASE_URL}/assignment/create-assignment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Assignment_no: parseInt(Assignment_num.split('-')[1]),
            topic,
            description: desc,
            date: date.toISOString().split('T')[0],
            time: date.toTimeString().split(' ')[0],
            section,
            semester: semester_no,
            Discipline: discipline,
            emp_no,
            course_no,
            current_sem,
          }),
        }
      );

      const data = await response.json();

      if (data.assignment_id) {
        setAssignmentId(data.assignment_id);
        return data.assignment_id;
      }

    } catch (error) {
      Alert.alert("Error", "Assignment creation failed");
    }
  };

  // ✅ SEND INDIVIDUAL
  const handleSend = async (reg_no) => {
    if (!validateForm()) return;

    try {
      let id = assignmentId;

      if (!id) {
        id = await createAssignment();
      }

      if (!id) return;

      const response = await fetch(
        `${BASE_URL}/assignment/send-assignment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assignment_id: id,
            reg_no: reg_no,
          }),
        }
      );

      const data = await response.json();
      Alert.alert(data.message);

      const updated = [...sentStudents, reg_no];
      setSentStudents(updated);

      // 🔥 AUTO DISABLE SEND ALL
      if (updated.length === students.length) {
        setAllSent(true);
      }

    } catch (error) {
      Alert.alert("Error", "Send failed");
    }
  };

  // ✅ SEND ALL
  const handleSendToAll = async () => {
    if (!validateForm()) return;

    try {
      let id = assignmentId;

      if (!id) {
        id = await createAssignment();
      }

      if (!id) return;

      const response = await fetch(
        `${BASE_URL}/assignment/send-assignment-all`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_no,
            Semester_no: semester_no,
            section,
            Discipline: discipline,
            Assignment_id: id,
            current_sem
          }),
        }
      );

      const data = await response.json();
      Alert.alert(data.message);

      setAllSent(true);

    } catch (error) {
      Alert.alert("Error", "Send all failed");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-back" size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{Assignment_num}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* INPUTS */}
        <Text style={styles.label}>TOPIC TITLE</Text>
        <TextInput style={styles.input} value={topic} onChangeText={setTopic} />

        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput style={[styles.input, { height: 100 }]} multiline value={desc} onChangeText={setDesc} />

        {/* DATE TIME */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text>{date.toLocaleTimeString()}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date"
            onChange={(e, d) => { setShowDatePicker(false); if (d) setDate(d); }} />
        )}

        {showTimePicker && (
          <DateTimePicker value={date} mode="time"
            onChange={(e, d) => { setShowTimePicker(false); if (d) setDate(d); }} />
        )}

        {/* STUDENTS */}
        <Text style={styles.label}>STUDENTS</Text>

        <View style={styles.studentContainer}>
          <ScrollView>
            {students.map((item) => {
              const isSent = sentStudents.includes(item.reg_no) || allSent;

              return (
                <View key={item.id} style={styles.studentCard}>
                  <View>
                    <Text style={styles.studentName}>{item.name}</Text>
                    <Text style={styles.studentId}>{item.reg_no}</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.sendBtn, isSent && { backgroundColor: 'gray' }]}
                    disabled={isSent}
                    onPress={() => handleSend(item.reg_no)}
                  >
                    <Text style={styles.sendText}>
                      {isSent ? "SENT" : "SEND"}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* SEND ALL */}
        <TouchableOpacity
          style={styles.sendAllBtn}
          onPress={handleSendToAll}
          disabled={allSent}
        >
          <Text style={[styles.sendAllText, allSent && { color: 'gray' }]}>
            {allSent ? "Already Sent" : "Send to All Students"}
          </Text>
        </TouchableOpacity>

        {/* VIEW REPORT */}
        <TouchableOpacity
          style={styles.viewReportBtn}
          onPress={() => navigation.navigate('AssignmentReport',
             {
              Assignment_num,
              emp_no,
              course_no,
              semester_no,
              section,
              discipline,
              current_sem 
             })}
        >
          <Text style={styles.reportText}>VIEW REPORT</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },

  headerTitle: { fontSize: 20, fontWeight: 'bold' },

  label: { marginTop: 15, fontWeight: 'bold' },

  input: { backgroundColor: '#eee', padding: 12, borderRadius: 10, marginTop: 5 },

  row: { flexDirection: 'row', justifyContent: 'space-between' },

  studentContainer: {
    maxHeight: 300,
    backgroundColor: '#f3f3f3',
    borderRadius: 10,
    padding: 5,
    marginTop: 10
  },

  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    marginBottom: 5,
    borderRadius: 8
  },

  studentName: { fontWeight: 'bold' },

  studentId: { color: 'gray', fontSize: 12 },

  sendBtn: { backgroundColor: '#A855F7', padding: 8, borderRadius: 8 },

  sendText: { color: '#fff' },

  sendAllBtn: { marginTop: 20 },

  sendAllText: { color: '#A855F7', fontWeight: 'bold' },

  viewReportBtn: {
    backgroundColor: '#A855F7',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center'
  },

  reportText: { color: '#fff', fontWeight: 'bold' }
});



// import React, { useState, useEffect } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   StyleSheet,
//   ScrollView,
//   SafeAreaView,
//   Alert
// } from 'react-native';
// import Icon from 'react-native-vector-icons/Ionicons';
// import DateTimePicker from '@react-native-community/datetimepicker';

// export default function ShareAssignment({ route, navigation }) {

//   const {
//     Assignment_num,
//     emp_no,
//     course_no,
//     semester_no,
//     section,
//     discipline,
//     current_sem
//   } = route.params;

//   const [topic, setTopic] = useState('');
//   const [desc, setDesc] = useState('');
//   const [date, setDate] = useState(new Date());

//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);

//   const [students, setStudents] = useState([]);
//   const [assignmentId, setAssignmentId] = useState(null);
//   const [sentStudents, setSentStudents] = useState([]);
//   const [allSent, setAllSent] = useState(false);

//   // ================= LOAD STUDENTS =================
//   useEffect(() => {
//     fetchStudents();
//   }, []);

//   // ================= CHECK STATUS AFTER LOAD =================
//   useEffect(() => {
//     if (students.length > 0) {
//       checkAssignmentStatus();
//     }
//   }, [students]);

//   // ================= VALIDATION =================
//   const validateForm = () => {
//     if (!topic || topic.trim() === '') {
//       Alert.alert("Validation Error", "Topic is required");
//       return false;
//     }
//     return true;
//   };

//   // ================= FETCH STUDENTS =================
//   const fetchStudents = async () => {
//     try {
//       const response = await fetch(
//         'http://192.168.0.104:8000/teacher/get-students-by-course',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             emp_no,
//             course_no,
//             discipline,
//             semester_no,
//             section,
//             current_sem
//           }),
//         }
//       );

//       const data = await response.json();

//       if (data.students) {
//         const formatted = data.students.map((s, index) => ({
//           id: index.toString(),
//           name: s.name,
//           reg_no: s.reg_no.trim(), // 🔥 ensure clean
//         }));

//         setStudents(formatted);
//       }

//     } catch (error) {
//       Alert.alert("Error", "Failed to load students");
//     }
//   };

//   // ================= CHECK STATUS =================
//   const checkAssignmentStatus = async () => {
//     try {
//       const response = await fetch(
//         'http://192.168.0.104:8000/assignment/check-assignment-status',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             course_no,
//             semester_no,
//             section,
//             discipline,
//             Assignment_no: parseInt(Assignment_num.split('-')[1]),
//             current_sem,
//           }),
//         }
//       );

//       const data = await response.json();

//       if (data.sent_students) {

//         const cleanSent = data.sent_students.map(s => s.trim());

//         setSentStudents(cleanSent);

//         // 🔥 PERFECT CHECK
//         const allSentFlag =
//           students.length > 0 &&
//           students.every(s => cleanSent.includes(s.reg_no));

//         setAllSent(allSentFlag);
//       }

//     } catch (error) {
//       console.log(error);
//     }
//   };

//   // ================= CREATE ASSIGNMENT =================
//   const createAssignment = async () => {
//     if (!validateForm()) return;

//     try {
//       const response = await fetch(
//         'http://192.168.0.104:8000/assignment/create-assignment',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             Assignment_no: parseInt(Assignment_num.split('-')[1]),
//             topic,
//             description: desc,
//             date: date.toISOString().split('T')[0],
//             time: date.toTimeString().split(' ')[0],
//             section,
//             semester: semester_no,
//             Discipline: discipline,
//             emp_no,
//             course_no,
//             current_sem,
//           }),
//         }
//       );

//       const data = await response.json();

//       if (data.assignment_id) {
//         setAssignmentId(data.assignment_id);
//         return data.assignment_id;
//       }

//     } catch (error) {
//       Alert.alert("Error", "Assignment creation failed");
//     }
//   };

//   // ================= SEND INDIVIDUAL =================
//   const handleSend = async (reg_no) => {
//     if (!validateForm()) return;

//     try {
//       let id = assignmentId;

//       if (!id) {
//         id = await createAssignment();
//       }

//       if (!id) return;

//       const response = await fetch(
//         'http://192.168.0.104:8000/assignment/send-assignment',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             assignment_id: id,
//             reg_no: reg_no,
//           }),
//         }
//       );

//       const data = await response.json();
//       Alert.alert(data.message);

//       // 🔥 FIX DUPLICATE
//       const updated = [...new Set([...sentStudents, reg_no])];
//       setSentStudents(updated);

//       // 🔥 RECHECK
//       const allSentFlag =
//         students.length > 0 &&
//         students.every(s => updated.includes(s.reg_no));

//       setAllSent(allSentFlag);

//     } catch (error) {
//       Alert.alert("Error", "Send failed");
//     }
//   };

//   // ================= SEND ALL =================
//   const handleSendToAll = async () => {
//     if (!validateForm()) return;

//     try {
//       let id = assignmentId;

//       if (!id) {
//         id = await createAssignment();
//       }

//       if (!id) return;

//       const response = await fetch(
//         'http://192.168.0.104:8000/assignment/send-assignment-all',
//         {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             course_no,
//             Semester_no: semester_no,
//             section,
//             Discipline: discipline,
//             Assignment_id: id,
//           }),
//         }
//       );

//       const data = await response.json();
//       Alert.alert(data.message);

//       // 🔥 SET ALL
//       const allRegNos = students.map(s => s.reg_no);

//       setSentStudents(allRegNos);
//       setAllSent(true);

//     } catch (error) {
//       Alert.alert("Error", "Send all failed");
//     }
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <ScrollView>

//         {/* HEADER */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()}>
//             <Icon name="chevron-back" size={24} />
//           </TouchableOpacity>
//           <Text style={styles.headerTitle}>{Assignment_num}</Text>
//           <View style={{ width: 40 }} />
//         </View>

//         {/* INPUTS */}
//         <Text style={styles.label}>TOPIC TITLE</Text>
//         <TextInput style={styles.input} value={topic} onChangeText={setTopic} />

//         <Text style={styles.label}>DESCRIPTION</Text>
//         <TextInput
//           style={[styles.input, { height: 100 }]}
//           multiline
//           value={desc}
//           onChangeText={setDesc}
//         />

//         {/* DATE TIME */}
//         <View style={styles.row}>
//           <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
//             <Text>{date.toLocaleDateString()}</Text>
//           </TouchableOpacity>

//           <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
//             <Text>{date.toLocaleTimeString()}</Text>
//           </TouchableOpacity>
//         </View>

//         {showDatePicker && (
//           <DateTimePicker
//             value={date}
//             mode="date"
//             onChange={(e, d) => {
//               setShowDatePicker(false);
//               if (d) setDate(d);
//             }}
//           />
//         )}

//         {showTimePicker && (
//           <DateTimePicker
//             value={date}
//             mode="time"
//             onChange={(e, d) => {
//               setShowTimePicker(false);
//               if (d) setDate(d);
//             }}
//           />
//         )}

//         {/* STUDENTS */}
//         <Text style={styles.label}>STUDENTS</Text>

//         <View style={styles.studentContainer}>
//           <ScrollView>
//             {students.map((item) => {

//               const isSent =
//                 sentStudents.includes(item.reg_no) || allSent;

//               return (
//                 <View key={item.id} style={styles.studentCard}>
//                   <View>
//                     <Text style={styles.studentName}>{item.name}</Text>
//                     <Text style={styles.studentId}>{item.reg_no}</Text>
//                   </View>

//                   <TouchableOpacity
//                     style={[
//                       styles.sendBtn,
//                       isSent && { backgroundColor: 'gray' }
//                     ]}
//                     disabled={isSent}
//                     onPress={() => handleSend(item.reg_no)}
//                   >
//                     <Text style={styles.sendText}>
//                       {isSent ? "SENT" : "SEND"}
//                     </Text>
//                   </TouchableOpacity>
//                 </View>
//               );
//             })}
//           </ScrollView>
//         </View>

//         {/* SEND ALL */}
//         <TouchableOpacity
//           style={styles.sendAllBtn}
//           onPress={handleSendToAll}
//           disabled={allSent}
//         >
//           <Text style={[styles.sendAllText, allSent && { color: 'gray' }]}>
//             {allSent ? "Already Sent" : "Send to All Students"}
//           </Text>
//         </TouchableOpacity>

//         {/* VIEW REPORT */}
//         <TouchableOpacity
//           style={styles.viewReportBtn}
//           onPress={() =>
//             navigation.navigate('AssignmentReport', {
//               Assignment_num,
//               emp_no,
//               course_no,
//               semester_no,
//               section,
//               discipline,
//               current_sem
//             })
//           }
//         >
//           <Text style={styles.reportText}>VIEW REPORT</Text>
//         </TouchableOpacity>

//       </ScrollView>
//     </SafeAreaView>
//   );
// }


// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20 },

//   header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },

//   headerTitle: { fontSize: 20, fontWeight: 'bold' },

//   label: { marginTop: 15, fontWeight: 'bold' },

//   input: { backgroundColor: '#eee', padding: 12, borderRadius: 10, marginTop: 5 },

//   row: { flexDirection: 'row', justifyContent: 'space-between' },

//   studentContainer: {
//     maxHeight: 300,
//     backgroundColor: '#f3f3f3',
//     borderRadius: 10,
//     padding: 5,
//     marginTop: 10
//   },

//   studentCard: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     padding: 12,
//     backgroundColor: '#fff',
//     marginBottom: 5,
//     borderRadius: 8
//   },

//   studentName: { fontWeight: 'bold' },

//   studentId: { color: 'gray', fontSize: 12 },

//   sendBtn: { backgroundColor: '#A855F7', padding: 8, borderRadius: 8 },

//   sendText: { color: '#fff' },

//   sendAllBtn: { marginTop: 20 },

//   sendAllText: { color: '#A855F7', fontWeight: 'bold' },

//   viewReportBtn: {
//     backgroundColor: '#A855F7',
//     padding: 15,
//     borderRadius: 10,
//     marginTop: 20,
//     alignItems: 'center'
//   },

//   reportText: { color: '#fff', fontWeight: 'bold' }
// });