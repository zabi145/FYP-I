import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { BASE_URL } from '../../config';

const ViewProgress = ({route, navigation}) => {
    const {
    emp_no,
    course_no,
    semester_no,
    section,
    discipline,
    current_sem,
    courseTitle,
    courseCode
  } = route.params;

  useEffect(() => {
    fetchStudents();
}, []);

  const [students, setStudents] = useState([]);

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

  const renderItem = ({ item }) => (
      <View style={styles.row}>
  
        {/* Student */}
        <View style={styles.col1}>
          <Text style={styles.nameText}>{item.name}</Text>
        </View>
  
        {/* Topic */}
        <View style={styles.col2}>
          <Text style={styles.idText}>{item.reg_no}</Text>
        </View>
  
        {/* Chart */}
        <View style={styles.col3}>
                <TouchableOpacity
                      style={styles.chartBtn}
                      onPress={() =>
                        navigation.navigate('ProgressChart', {
                            regNo: item.reg_no,
                            course_no: course_no,
                            semester_no: semester_no,
                            section: section,
                            discipline: discipline,
                            current_sem:current_sem,
                            emp_no: emp_no,
                        })
                      }
                    >
                      <Text  style={{ color: '#fff' }}>Chart</Text>
                </TouchableOpacity>
        </View>
    </View>
  );


  return (
    <View style={styles.container}>

      <View style={styles.header}>  
      <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="chevron-back" size={24} color="black" />
              </TouchableOpacity>

        <View style={styles.titleContainer}>
            <Text style={styles.title}>{courseTitle}</Text>
            <Text style={styles.subTitle}>{courseCode}</Text>
        </View>
      </View>  

       <View style={styles.tableHeader}>
            <Text style={styles.headerLabel}>STUDENT Name</Text>
            <Text style={styles.headerLabel}>ARID Number</Text>
            <Text style={styles.headerLabel}>Progress Chart</Text>
        </View>

        <View>
        <FlatList
            data={students}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
        />
        </View>
    </View>

  );
};

const styles = StyleSheet.create({
    headerLabel: { 
    fontSize: 13, 
    color: '#AAA', 
    fontWeight: 'bold', 
    width: '30%', 
    textAlign: 'center' 
  },

    tableHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 15 
 },

    title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },

  subTitle: {
    fontSize: 14,
    color: '#666',
  },

    titleContainer: {
    marginLeft: 20,
  },

    header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },

    container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 25,
  },
  
   backButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 25,
  },

  col1: { width: '35%' },
  col2: { width: '35%' },
  col3: { width: '30%', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F9F9F9' },
  nameText: { fontSize: 13, fontWeight: 'bold' },
  idText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chartBtn: { backgroundColor: '#A855F7', padding: 6, borderRadius: 20,width: 70, alignItems: 'center' },

})

export default ViewProgress;
