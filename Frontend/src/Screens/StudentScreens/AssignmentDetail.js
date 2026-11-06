import React from 'react';
import {Alert ,View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function AssignmentDetail({ navigation, route }) {

    const {
        course_no,
        course_name,
        discipline,
        pending_assignments,
        submitted_assignments,
        reg_no,
        section,
        batch_semester,
        current_sem
    } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="chevron-back" size={28} color="black" />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>{course_name}</Text>

                <View style={{ width: 20 }} />
            </View>

            <View style={styles.content}>
                
                {/* ✅ ASSIGNED TASK */}
                <TouchableOpacity 
                        style={styles.mainBtn}
                        onPress={() => {
                     if ((pending_assignments+submitted_assignments) === 0) {
                            Alert.alert("No Task", "No assignment available");
                         return;
                     }
                    navigation.navigate('TaskScreen', {
                    course_no,
                    discipline,
                    reg_no,
                    section,
                    semester_no:batch_semester,
                    current_sem
                    });
                    }}
                >
                    <View style={styles.btnRow}>
                        <View>
                            <Text style={styles.btnTitle}>Assigned Task</Text>

                            {/* 🔥 DYNAMIC COUNT */}
                        {(pending_assignments+submitted_assignments) > 0 && (
                            <View style={styles.badge}>
                                 <Text style={styles.badgeText}>
                                       {pending_assignments} task pending | {submitted_assignments} submitted
                                 </Text>
                            </View>
                        )}
                        </View>

                        <Text style={styles.arrowIcon}>{"\u203A"}</Text>
                    </View>
                </TouchableOpacity>

                {/* ✅ RESULTS */}
                <TouchableOpacity 
                    style={styles.mainBtn}
                    onPress={() => navigation.navigate('ResultScreen', {
                        reg_no,
                        course_no,
                        section,
                        semester_no:batch_semester,
                        discipline,
                        current_sem
                    })}
                >
                    <View style={styles.btnRow}>
                        <Text style={styles.btnTitle}>Results</Text>
                        <Text style={styles.arrowIcon}>{"\u203A"}</Text>
                    </View>
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 20,
        marginTop: 10,
    },
    backArrow: {
        fontSize: 35,
        fontWeight: 'bold',
        color: '#000',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        padding: 20,
        marginTop: 20,
    },
    mainBtn: {
        backgroundColor: '#A855F7', // Purple Color
        borderRadius: 20,
        padding: 25,
        marginBottom: 20,
        // Shadow
        // elevation: 8,
        // shadowColor: '#A855F7',
        // shadowOffset: { width: 0, height: 4 },
        // shadowOpacity: 0.3,
        // shadowRadius: 5,
    },
    resultsBtn: { 
        // paddingVertical: 35, // Image ke mutabik height adjust ki
    },
    btnRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    btnTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    badge: {
        backgroundColor: '#E11D48', // Red color
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        marginTop: 8,
    },
    badgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    arrowIcon: {
        color: 'white',
        fontSize: 30,
        fontWeight: '200',
    },
});