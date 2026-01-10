import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, Linking, Platform, KeyboardAvoidingView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppContext } from '../store/AppContext';
import {
  Search, Plus, UserPlus, Phone, Mail, MapPin, Trash2,
  Edit2, X, CheckCircle2, Bell, BellRing, Clock, AlertTriangle, Timer
} from 'lucide-react-native';
import { Client, ClientReminder } from '../types';

const ClientList: React.FC = () => {
  const { state, deleteClient, addClient, updateClient } = useAppContext();
  const { clients, darkMode } = state;

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Stan dla przypomnień
  const [reminderModal, setReminderModal] = useState<{ isOpen: boolean; client: Client | null }>({ isOpen: false, client: null });
  const [newReminder, setNewReminder] = useState({ date: new Date(), topic: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);

  const initialClientData: Partial<Client> = {
    firstName: '', lastName: '', phone: '', email: '', companyName: '',
    nip: '', street: '', houseNo: '', apartmentNo: '', postalCode: '',
    city: '', notes: '', reminders: []
  };

  const [formData, setFormData] = useState<Partial<Client>>(initialClientData);

  const filteredClients = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return clients.filter(c =>
      c.firstName.toLowerCase().includes(search) ||
      c.lastName.toLowerCase().includes(search) ||
      (c.companyName?.toLowerCase().includes(search) ?? false)
    );
  }, [clients, searchTerm]);

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData(client);
    } else {
      setEditingClient(null);
      setFormData(initialClientData);
    }
    setIsModalOpen(true);
  };

  const handleAddReminder = async () => {
    if (!reminderModal.client || !newReminder.topic) return;

    const reminder: ClientReminder = {
      id: Date.now().toString(),
      date: newReminder.date.toLocaleDateString('pl-PL'),
      time: newReminder.date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      topic: newReminder.topic,
      completed: false,
      notified: false
    };

    const updatedClient: Client = {
      ...reminderModal.client,
      reminders: [...(reminderModal.client.reminders ?? []), reminder]
    };

    await updateClient(updatedClient);
    setNewReminder({ date: new Date(), topic: '' });
    setReminderModal({ isOpen: false, client: null });
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      Alert.alert("Błąd", "Wypełnij podstawowe dane klienta.");
      return;
    }

    const clientData: Client = {
      ...formData,
      id: editingClient?.id || `cli_${Date.now()}`,
      createdAt: editingClient?.createdAt || new Date().toISOString(),
      reminders: formData.reminders ?? []
    } as Client;

    if (editingClient) await updateClient(clientData);
    else await addClient(clientData);

    setIsModalOpen(false);
  };

  const triggerDelete = (client: Client) => {
    Alert.alert(
      "Usuń klienta",
      `Czy na pewno chcesz usunąć: ${client.firstName} ${client.lastName}?`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: () => deleteClient(client.id) }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      {/* Wyszukiwarka */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#64748b" style={styles.searchIcon} />
        <TextInput
          placeholder="Szukaj klienta..."
          placeholderTextColor="#64748b"
          style={[styles.searchInput, { backgroundColor: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#fff' : '#000' }]}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <UserPlus size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Brak klientów</Text>
          </View>
        ) : (
          filteredClients.map(client => (
            <View key={client.id} style={[styles.clientCard, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{client.firstName[0]}{client.lastName[0]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.clientName, { color: darkMode ? '#fff' : '#0f172a' }]}>{client.firstName} {client.lastName}</Text>
                  <TouchableOpacity
                    onPress={() => setReminderModal({ isOpen: true, client })}
                    style={styles.addReminderBadge}
                  >
                    <Bell size={10} color="#fff" />
                    <Text style={styles.addReminderText}>+ ZADANIE</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.row}>
                  <TouchableOpacity onPress={() => handleOpenModal(client)} style={styles.iconBtn}><Edit2 size={16} color="#64748b" /></TouchableOpacity>
                  <TouchableOpacity onPress={() => triggerDelete(client)} style={styles.iconBtn}><Trash2 size={16} color="#ef4444" /></TouchableOpacity>
                </View>
              </View>

              {/* Przypomnienia */}
              {client.reminders && client.reminders.length > 0 && (
                <View style={styles.remindersBox}>
                  {client.reminders.map(rem => (
                    <View key={rem.id} style={[styles.reminderItem, { backgroundColor: darkMode ? '#1e293b' : '#f8fafc' }]}>
                      <Text style={[styles.reminderTopic, { color: darkMode ? '#f1f5f9' : '#0f172a' }]}>{rem.topic}</Text>
                      <Text style={styles.reminderTime}>{rem.date} • {rem.time}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Akcje szybkie */}
              <View style={styles.row}>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${client.phone}`)} style={[styles.actionBtn, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }]}>
                  <Phone size={14} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: darkMode ? '#fff' : '#0f172a' }]}>ZADZWOŃ</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${client.email}`)} style={[styles.actionBtn, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9' }]}>
                  <Mail size={14} color="#3b82f6" />
                  <Text style={[styles.actionBtnText, { color: darkMode ? '#fff' : '#0f172a' }]}>NAPISZ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Przycisk Floating Add */}
      <TouchableOpacity onPress={() => handleOpenModal()} style={styles.fab}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL KLIENTA */}
      <Modal visible={isModalOpen} animationType="slide">
        <View style={[styles.modalFull, { backgroundColor: darkMode ? '#020617' : '#fff' }]}>
          <View style={styles.modalHeaderFull}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#0f172a' }]}>{editingClient ? 'Edytuj' : 'Nowy Klient'}</Text>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}><X size={28} color={darkMode ? '#fff' : '#000'} /></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <KeyboardAvoidingView behavior="padding">
              <Text style={styles.inputLabel}>DANE OSOBOWE</Text>
              <View style={styles.row}>
                <InputField label="Imię" value={formData.firstName} onChangeText={(v:any)=>setFormData({...formData, firstName:v})} darkMode={darkMode} />
                <InputField label="Nazwisko" value={formData.lastName} onChangeText={(v:any)=>setFormData({...formData, lastName:v})} darkMode={darkMode} />
              </View>
              <InputField label="Telefon" value={formData.phone} onChangeText={(v:any)=>setFormData({...formData, phone:v})} darkMode={darkMode} keyboardType="phone-pad" />
              <InputField label="Email" value={formData.email} onChangeText={(v:any)=>setFormData({...formData, email:v})} darkMode={darkMode} keyboardType="email-address" />

              <Text style={[styles.inputLabel, {marginTop: 20}]}>ADRES REALIZACJI</Text>
              <InputField label="Ulica" value={formData.street} onChangeText={(v:any)=>setFormData({...formData, street:v})} darkMode={darkMode} />
              <View style={styles.row}>
                <InputField label="Nr domu" value={formData.houseNo} onChangeText={(v:any)=>setFormData({...formData, houseNo:v})} darkMode={darkMode} />
                <InputField label="Nr lokalu" value={formData.apartmentNo} onChangeText={(v:any)=>setFormData({...formData, apartmentNo:v})} darkMode={darkMode} />
              </View>
              <InputField label="Miejscowość" value={formData.city} onChangeText={(v:any)=>setFormData({...formData, city:v})} darkMode={darkMode} />

              <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>ZAPISZ KLIENTA</Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </ScrollView>
        </View>
      </Modal>

      {/* MODAL PRZYPOMNIENIA */}
      <Modal visible={reminderModal.isOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.reminderCard, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
            <Text style={[styles.reminderTitle, { color: darkMode ? '#fff' : '#000' }]}>Planuj zadanie</Text>
            <TextInput
              placeholder="Co trzeba zrobić?"
              placeholderTextColor="#64748b"
              style={[styles.input, { backgroundColor: darkMode ? '#020617' : '#f8fafc', color: darkMode ? '#fff' : '#000' }]}
              value={newReminder.topic}
              onChangeText={(v) => setNewReminder({...newReminder, topic: v})}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.datePickerBtn}>
              <Clock size={16} color="#2563eb" />
              <Text style={styles.datePickerBtnText}>{newReminder.date.toLocaleString('pl-PL')}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newReminder.date}
                mode="datetime"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setNewReminder({...newReminder, date});
                }}
              />
            )}

            <TouchableOpacity onPress={handleAddReminder} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>USTAW PRZYPOMNIENIE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReminderModal({isOpen: false, client: null})}><Text style={{color: '#64748b', textAlign: 'center', marginTop: 10}}>Anuluj</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const InputField = ({ label, value, onChangeText, darkMode, keyboardType }: any) => (
  <View style={{ flex: 1, marginBottom: 12, marginHorizontal: 4 }}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={[styles.input, { backgroundColor: darkMode ? '#0f172a' : '#fff', color: darkMode ? '#fff' : '#000', borderColor: darkMode ? '#1e293b' : '#e2e8f0', borderWidth: 1 }]}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 50 : 10 },
  searchContainer: { paddingHorizontal: 16, position: 'relative', marginBottom: 10 },
  searchIcon: { position: 'absolute', left: 28, top: 18, zIndex: 1 },
  searchInput: { height: 54, borderRadius: 27, paddingLeft: 44, paddingRight: 20, fontSize: 14, fontWeight: 'bold', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  emptyState: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 12, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' },
  clientCard: { marginHorizontal: 4, marginBottom: 16, borderRadius: 32, padding: 20, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#2563eb20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#2563eb', fontWeight: '900', fontSize: 18 },
  clientName: { fontSize: 18, fontWeight: '900' },
  addReminderBadge: { backgroundColor: '#2563eb', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  addReminderText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  iconBtn: { padding: 8 },
  remindersBox: { marginBottom: 16, gap: 8 },
  reminderItem: { padding: 12, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  reminderTopic: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  reminderTime: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, height: 48, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionBtnText: { fontSize: 10, fontWeight: '900' },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 64, height: 64, borderRadius: 24, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalFull: { flex: 1 },
  modalHeaderFull: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  inputLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', letterSpacing: 1, marginBottom: 4 },
  input: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 14, fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#2563eb', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 20, borderBottomWidth: 4, borderBottomColor: '#1e40af' },
  saveBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  reminderCard: { borderRadius: 32, padding: 24, gap: 12 },
  reminderTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  datePickerBtn: { height: 56, borderRadius: 16, borderWeight: 1, borderColor: '#e2e8f0', borderWidth: 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  datePickerBtnText: { fontSize: 13, fontWeight: 'bold', color: '#2563eb' }
});

export default ClientList;