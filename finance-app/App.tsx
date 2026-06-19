import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/summary')
      .then(res => res.json())
      .then(json => setData(json.data))
      .catch(err => console.log('ERROR:', err));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Finance Dashboard</Text>
      <Text>Income: {data?.income ?? 'Loading...'}</Text>
      <Text>Expense: {data?.expense ?? 'Loading...'}</Text>
      <Text>Balance: {data?.balance ?? 'Loading...'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
});