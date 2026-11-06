import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { BASE_URL } from '../../config';

export default function Studentdashboard({ navigation, route }) {

  const { userId } = route.params;

  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);


  const [studentName, setStudentName] = useState('');
  const [regNo, setRegNo] = useState('');
  const [section, setSection] = useState('');
  const [batchSemester, setBatchSemester] = useState('');

  //  LOAD DATA
  useEffect(() => {
    fetchDashboard();
  }, []);

  //  API CALL
  const fetchDashboard = async () => {
    try {
      const response = await fetch(
        `${BASE_URL}/student/student-dashboard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId
          }),
        }
      );

      const data = await response.json();

      console.log("STUDENT DASHBOARD:", data);

      if (data.courses) {

        // 🔥 STORE STUDENT INFO
        setStudentName(data.student_name);
        setRegNo(data.reg_no);
        setSection(data.section);
        setBatchSemester(data.batch_semester);

        // FORMAT COURSES
        const formatted = data.courses.map((item, index) => ({
          id: index.toString(),
          name: item.course_name,
          course_no: item.course_no,
          semester: item.semester,
          discipline: item.discipline,
          pending_assignments: item.pending_assignments, 
          submitted_assignments: item.submitted_assignments,
          current_sem: item.current_sem,
          hasTask: (item.pending_assignments + item.submitted_assignments) > 0
        }));

        setSubjects(formatted);
      }

    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to load dashboard");
    }
  };

  // LOGOUT
  const handleLogout = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'Login' }
      ]
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* HEADER */}
      <Text style={styles.header}>Dashboard</Text>

      {/* GREETING */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>Hello! {studentName}</Text>
        <Text style={styles.subGreeting}>Welcome to your dashboard</Text>
      </View>

      {/* SUBJECT LIST */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Enrolled Subjects</Text>

        {subjects.map((subject) => {
          const isSelected = selectedSubject === subject.id;

          return (
            <TouchableOpacity
              key={subject.id}
              style={[
                styles.subjectCard,
                isSelected && styles.subjectCardSelected
              ]}
              onPress={() => {

                setSelectedSubject(subject.id);

                // NAVIGATION WITH FULL DATA
                navigation.navigate('AssignmentDetail', {
                  course_no: subject.course_no,
                  course_name: subject.name,
                  discipline: subject.discipline,
                  pending_assignments: subject.pending_assignments,
                  submitted_assignments: subject.submitted_assignments,
                  reg_no: regNo,
                  section: section,
                  batch_semester: batchSemester,
                  current_sem: subject.current_sem 
                });
              }}
              activeOpacity={0.8}
            >

              {/* LEFT SIDE */}
              <View style={styles.subjectInfo}>
                <Text style={[
                  styles.subjectName
                ]}>
                  {subject.name}
                </Text>

                {/* 🔥 TASK LABEL */}
                {subject.hasTask && (
                  <View style={styles.taskBadge}>
                    <Text style={styles.taskBadgeText}>
                      TASK ASSIGNED
                    </Text>
                  </View>
                )}
              </View>

              {/* RADIO BUTTON */}
              <View style={[
                styles.radioOuter,
                isSelected && styles.radioOuterSelected
              ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>

            </TouchableOpacity>
          );
        })}
      </View>

      {/* LOGOUT */}
      <TouchableOpacity
        style={styles.logoutButton}
        activeOpacity={0.85}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const PURPLE = '#a855f7';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },

  header: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    color: '#111',
  },

  greetingContainer: {
    marginTop: 32,
    marginBottom: 32,
  },

  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111',
  },

  subGreeting: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },

  sectionContainer: {
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },

  subjectCardSelected: {
    borderColor: PURPLE,
  },

  subjectInfo: {
    flex: 1,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },

  subjectNameSelected: {
    color: '#111',
  },

  taskBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: PURPLE,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  taskBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  radioOuterSelected: {
    borderColor: PURPLE,
  },

  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PURPLE,
  },

  logoutButton: {
    backgroundColor: PURPLE,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    elevation: 8,
  },

  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});