// import React, { useEffect, useState } from 'react';
// import { View, Text, Alert, StyleSheet, TouchableOpacity } from 'react-native';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { BASE_URL } from '../../config';

// const ProgressChart = ({ navigation, route }) => {
//   const {
//     regNo,
//     course_no,
//     semester_no,
//     section,
//     discipline,
//     current_sem,
//     emp_no,
//   } = route.params;


//   // Assignments ki list
//   const [assignments, setAssignments] = useState([]);
//   const [chartData, setChartData] = useState(null);

//   // Screen khulte hi assignments fetch hongi
// useEffect(() => {
//   fetchAssignments();
// }, []);

//   const fetchAssignments = async () => {
//     try {
//       const response = await fetch(`${BASE_URL}/assignment/get-assignments`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           emp_no,
//           course_no,
//           semester_no,
//           section,
//           discipline,
//           current_sem,
//         }),
//       });

//       const data = await response.json();

//         console.log("========== ASSIGNMENTS API ==========");
//         console.log("Status:", response.status);
//         console.log("Complete Response:", JSON.stringify(data, null, 2));

//       if (data.assignments) {
//           setAssignments(data.assignments);

//           console.log("Assignments:", data.assignments);

//       // Get all Assignment IDs
//           const assignmentIds = data.assignments.map(
//           item => item.Assignment_id
//           );

//           console.log("All Assignment IDs:", assignmentIds);

//      // Send all IDs to Chart API
//           fetchChartData(assignmentIds);
//       }

//     } catch (error) {
//       console.log(error);
//       Alert.alert('Error', 'Failed to load assignments');
//     }
//   };


//   const fetchChartData = async (assignmentIds) => {
//   try {
//     const response = await fetch(`${BASE_URL}/teacher/get-chart-data`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         assignment_id: assignmentIds,
//         reg_no: regNo,
//         course_no: course_no,
//         Semester_no: semester_no,
//         section: section,
//         Discipline: discipline,
//         current_sem: current_sem,
//       }),
//     });

//     const data = await response.json();

//     console.log("========== CHART DATA API ==========");
//     console.log("Status:", response.status);
//     console.log("All Assignment Scores:", JSON.stringify(data, null, 2));

//     // Tumhari API directly array return kar rahi hai
//     if (Array.isArray(data)) {
//       setChartData(data);
//     }

//   } catch (error) {
//     console.log("Chart API Error:", error);
//     Alert.alert('Error', 'Failed to load chart data');
//   }
// };


//   return (
//     <View>
//       <View style={styles.header}>
//         <TouchableOpacity
//           style={styles.backButton}
//           onPress={() => navigation.goBack()}
//         >
//           <Icon name="chevron-back" size={24} color="black" />
//         </TouchableOpacity>

//         <View style={styles.RegNoContainer}>
//           <Text style={styles.RegNo}>{regNo}</Text>
//         </View>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   RegNoContainer: {
//     marginLeft: 70,
//   },

//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: 20,
//     marginBottom: 40,
//   },

//   backButton: {
//     backgroundColor: '#F3F4F6',
//     padding: 10,
//     borderRadius: 25,
//   },

//   RegNo: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     color: '#000',
//   },
// });

// export default ProgressChart;



import React, { useEffect, useState } from 'react';

import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
import { BarChart } from 'react-native-gifted-charts';
import { BASE_URL } from '../../config';

const ProgressChart = ({ navigation, route }) => {

  const {
    regNo,
    course_no,
    semester_no,
    section,
    discipline,
    current_sem,
    emp_no,
  } = route.params;

  const [assignments, setAssignments] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Chart colors
  const colors = {
    neck: '#6366F1',
    eye: '#22C55E',
    confidence: '#F59E0B',
    topic: '#EC4899',
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Fetch assignments
  const fetchAssignments = async () => {
    try {

      const response = await fetch(
        `${BASE_URL}/assignment/get-assignments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emp_no,
            course_no,
            semester_no,
            section,
            discipline,
            current_sem,
          }),
        }
      );

      const data = await response.json();

      //console.log('Assignments API:', data);

      if (data.assignments) {

        setAssignments(data.assignments);

        // Get all assignment IDs
        const assignmentIds = data.assignments.map(
          item => item.Assignment_id
        );

        //console.log('Assignment IDs:', assignmentIds);

        // Fetch scores
        await fetchChartData(assignmentIds);

      }

    } catch (error) {

      console.log('Assignments API Error:', error);

      Alert.alert('Error', 'Failed to load assignments');

    } finally {
      setLoading(false);
    }
  };

  // Fetch chart scores
  const fetchChartData = async (assignmentIds) => {
    try {

      const response = await fetch(
        `${BASE_URL}/teacher/get-chart-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assignment_id: assignmentIds,
            reg_no : regNo,
            course_no,
            Semester_no: semester_no,
            section,
            Discipline: discipline,
            current_sem,
          }),
        }
      );

      const data = await response.json();

      console.log('Chart API Status:', response.status);
      console.log('Chart API Data:', data);

      if (response.ok && Array.isArray(data)) {
        setChartData(data);
      } else {
        console.log('Invalid chart response:', data);
      }

    } catch (error) {

      console.log('Chart API Error:', error);

      Alert.alert('Error', 'Failed to load chart data');

    }
  };

  // Prepare grouped bar chart data
  const barData = chartData.flatMap((item, index) => {

    const assignment = assignments.find(
      a => a.Assignment_id === item.assignment_id
    );

    const assignmentNo = assignment
      ? assignment.Assignment_no
      : index + 1;

    return [

      {
        value: Number(item.neck_movement) || 0,
        frontColor: colors.neck,
        label: `A${assignmentNo}`,
        labelWidth: 65,
        labelTextStyle: {
          color: '#374151',
          fontSize: 11,
        },
        spacing: 2,
      },

      {
        value: Number(item.eye_contact) || 0,
        frontColor: colors.eye,
        spacing: 2,
      },

      {
        value: Number(item.confidence) || 0,
        frontColor: colors.confidence,
        spacing: 2,
      },

      {
        value: Number(item.topic_relevance) || 0,
        frontColor: colors.topic,

        // Gap between assignment groups
        spacing: 18,
      },

    ];
  });

  return (

    <ScrollView style={styles.container}>

      {/* Header */}

      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon
            name="chevron-back"
            size={24}
            color="black"
          />
        </TouchableOpacity>

        <View style={styles.RegNoContainer}>
          <Text style={styles.RegNo}>{regNo}</Text>
        </View>

      </View>

      {/* Chart Heading */}

      <Text style={styles.heading}>
        Student Progress Report
      </Text>

      <Text style={styles.subHeading}>
        Assignment-wise Performance
      </Text>

      {loading ? (

        <ActivityIndicator
          size="large"
          color="#6366F1"
          style={{ marginTop: 50 }}
        />

      ) : chartData.length > 0 ? (

        <View style={styles.chartContainer}>

          {/* Legend */}

          <View style={styles.legend}>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.neck }]} />
              <Text style={styles.legendText}>Neck Movement</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.eye }]} />
              <Text style={styles.legendText}>Eye Contact</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.confidence }]} />
              <Text style={styles.legendText}>Confidence</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.topic }]} />
              <Text style={styles.legendText}>Topic Relevance</Text>
            </View>

          </View>

          {/* Multi Bar Chart */}

          <ScrollView horizontal showsHorizontalScrollIndicator>

            <BarChart
              data={barData}
              barWidth={12}
              height={250}
              maxValue={100}
              noOfSections={5}
              stepValue={20}
              barBorderRadius={4}
              isAnimated
              animationDuration={800}
              yAxisThickness={1}
              xAxisThickness={1}
              yAxisTextStyle={{
                color: '#6B7280',
                fontSize: 11,
              }}
              xAxisLabelTextStyle={{
                color: '#374151',
                fontSize: 11,
              }}
              hideRules={false}
              yAxisLabelSuffix="%"
              initialSpacing={15}
              endSpacing={15}
            />

          </ScrollView>

        </View>

      ) : (

        <Text style={styles.noData}>
          No chart data available.
        </Text>

      )}

    </ScrollView>

  );
};

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 25,
    paddingHorizontal: 15,
  },

  backButton: {
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 25,
  },

  RegNoContainer: {
    marginLeft: 70,
  },

  RegNo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },

  heading: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#111827',
    marginHorizontal: 20,
  },

  subHeading: {
    fontSize: 14,
    color: '#6B7280',
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 20,
  },

  chartContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginBottom: 25,
    padding: 15,
    borderRadius: 12,
    elevation: 3,
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 25,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },

  legendText: {
    fontSize: 11,
    color: '#374151',
  },

  noData: {
    textAlign: 'center',
    marginTop: 50,
    color: '#6B7280',
    fontSize: 16,
  },

});

export default ProgressChart;
