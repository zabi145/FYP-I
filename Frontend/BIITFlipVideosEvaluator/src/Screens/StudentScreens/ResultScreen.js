import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { BASE_URL } from '../../config';

export default function ResultsScreen({ navigation, route }) {

    const { reg_no, course_no ,section ,semester_no , discipline , current_sem} = route.params;

    const [results, setResults] = useState([]);

    useEffect(() => {
        fetchResults();
    }, []);

    const fetchResults = async () => {
        try {
            const response = await fetch(
                `${BASE_URL}/student/student-results`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reg_no, course_no , current_sem }),
                }
            );

            const data = await response.json();

            if (data.assignments) {
                setResults(data.assignments);
            }

        } catch (error) {
            Alert.alert("Error", "Failed to load results");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Text style={styles.backArrow}>{"\u2039"}</Text>
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Results</Text>

                <View style={{ width: 45 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>

                <Text style={styles.mainTitle}>Student Results</Text>
                <Text style={styles.subTitle}>Video Submissions</Text>

                {/* TABLE HEADER */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerCell, { flex: 2 }]}>TOPIC & DEADLINE</Text>
                    <Text style={styles.headerCell}>STATUS</Text>
                    <Text style={styles.headerCell}>RATING</Text>
                    <Text style={styles.headerCell}>REVIEWS</Text>
                </View>

                {/* DATA */}
                {results.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 30 }}>
                        No Results Found
                    </Text>
                ) : (
                    results.map((item) => (
                        <View key={item.assignment_id} style={styles.tableRow}>

                            {/* TOPIC */}
                            <View style={{ flex: 2 }}>
                                <Text style={styles.topicText}>{item.topic}</Text>
                                <Text style={styles.dateText}>{item.deadline_date}</Text>
                            </View>

                            {/* STATUS */}
                            <Text style={[
                                styles.cellText,
                                { color: item.status === "Pending" ? 'orange' : 'green', fontWeight: 'bold' }
                            ]}>
                                {item.status}
                            </Text>

                            {/* RATING */}
                            <Text style={styles.ratingText}>
                                {item.award_score}/10
                            </Text>

                            {/* VIDEO ICON */}
                            <View style={styles.iconCell}>
                                {item.video_uploaded === "Yes" && (
                                    <TouchableOpacity
                                        onPress={() => navigation.navigate("EvaluationDetails", {
                                                reg_no: reg_no,
                                                course_no: course_no,
                                                assignment_id: item.assignment_id,
                                                section:section,
                                                semester_no:semester_no,
                                                discipline:discipline,
                                                current_sem:current_sem
                                                })}
                                    >
                                        <Text style={styles.playIcon}>{"\u25B6"}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                        </View>
                    ))
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },

    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        marginTop: 20 
    },

    backBtn: { 
        backgroundColor: '#F9FAFB', 
        width: 45, 
        height: 45, 
        borderRadius: 12, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },

    backArrow: { fontSize: 30 },

    headerTitle: { fontSize: 22, fontWeight: 'bold' },

    scrollContent: { padding: 20 },

    mainTitle: { fontSize: 26, fontWeight: 'bold' },

    subTitle: { fontSize: 16, color: '#666', marginBottom: 20 },

    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderColor: '#ddd',
    },

    headerCell: {
        flex: 1,
        fontSize: 10,
        fontWeight: 'bold',
    },

    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderColor: '#f2f2f2',
    },

    topicText: { fontSize: 12, fontWeight: 'bold' },

    dateText: { fontSize: 10, color: '#999' },

    cellText: { flex: 1, fontSize: 11 },

    ratingText: { flex: 1, fontWeight: 'bold', color: '#A855F7' },

    iconCell: { flex: 1, alignItems: 'center' },

    playIcon: { color: '#A855F7', fontSize: 18 },
});