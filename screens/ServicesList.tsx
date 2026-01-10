import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, Platform, SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Wymaga: npx expo install @react-native-picker/picker
import { useAppContext } from '../store/AppContext';
import {
  Plus, Trash2, Edit2, Search, ChevronDown, ChevronRight,
  X, Tag, Save, FolderPlus, Package, AlertCircle
} from 'lucide-react-native';
import { Service, UnitOfMeasure, MaterialItem, MaterialMode } from '../types';

const ServicesList: React.FC = () => {
  const { state, addService, updateService, deleteService, addCategory, deleteCategory } = useAppContext();
  const { darkMode, categories, services } = state;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '', description: '', netPrice: '', vatRate: '8',
    unit: 'm2' as UnitOfMeasure, categoryId: '',
    materialMode: 'estimated' as MaterialMode, estimatedMaterialPrice: '',
    materials: [] as MaterialItem[]
  });

  const [newMaterial, setNewMaterial] = useState({ name: '', price: '', unit: 'szt' as UnitOfMeasure, consumption: '' });

  // --- Kategorie ---
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    Alert.alert(
      "OSTRZEŻENIE",
      `Usunięcie kategorii "${categoryName}" spowoduje usunięcie WSZYSTKICH przypisanych do niej usług. Kontynuować?`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń wszystko", style: "destructive", onPress: () => deleteCategory(categoryId) }
      ]
    );
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({ id: Date.now().toString(), name: newCatName.trim() });
    setNewCatName('');
  };

  // --- Formularz ---
  const handleSubmit = () => {
    if (!formData.name || !formData.netPrice) {
      Alert.alert("Błąd", "Podaj nazwę i cenę usługi.");
      return;
    }

    const serviceData: Service = {
      id: editingService?.id || Date.now().toString(),
      name: formData.name,
      description: formData.description,
      netPrice: parseFloat(formData.netPrice) || 0,
      vatRate: parseInt(formData.vatRate),
      unit: formData.unit,
      categoryId: formData.categoryId || undefined,
      materialMode: formData.materialMode,
      estimatedMaterialPrice: formData.materialMode === 'estimated' ? parseFloat(formData.estimatedMaterialPrice) : 0,
      defaultMaterials: formData.materialMode === 'detailed' ? formData.materials : []
    };

    if (editingService) updateService(serviceData);
    else addService(serviceData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', netPrice: '', vatRate: '8', unit: 'm2', categoryId: '', materialMode: 'estimated', estimatedMaterialPrice: '', materials: [] });
    setEditingService(null);
    setIsModalOpen(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      netPrice: service.netPrice.toString(),
      vatRate: service.vatRate.toString(),
      unit: service.unit,
      categoryId: service.categoryId || '',
      materialMode: service.materialMode || 'estimated',
      estimatedMaterialPrice: service.estimatedMaterialPrice?.toString() || '',
      materials: service.defaultMaterials || []
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>
      {/* Search & Add Category */}
      <View style={styles.topBar}>
        <View style={[styles.searchWrapper, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
          <Search size={18} color="#64748b" />
          <TextInput
            placeholder="Szukaj usługi..."
            placeholderTextColor="#64748b"
            style={[styles.searchInput, { color: darkMode ? '#fff' : '#000' }]}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <TouchableOpacity
          onPress={() => setIsCatModalOpen(true)}
          style={[styles.catBtn, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}
        >
          <FolderPlus size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {categories.map(cat => (
          <View key={cat.id} style={styles.catSection}>
            <TouchableOpacity
              onPress={() => setExpandedCats(prev => ({...prev, [cat.id]: !prev[cat.id]}))}
              style={styles.catHeader}
            >
              <Text style={[styles.catTitle, { color: darkMode ? '#94a3b8' : '#1e293b' }]}>{cat.name.toUpperCase()}</Text>
              {expandedCats[cat.id] ? <ChevronDown size={16} color="#2563eb" /> : <ChevronRight size={16} color="#64748b" />}
            </TouchableOpacity>

            {!expandedCats[cat.id] && (
              <View style={styles.serviceGrid}>
                {filteredServices.filter(s => s.categoryId === cat.id).map(service => (
                  <ServiceCard key={service.id} service={service} darkMode={darkMode} onEdit={() => handleEdit(service)} onDelete={() => deleteService(service.id)} />
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity onPress={() => setIsModalOpen(true)} style={styles.fab}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL USŁUGI */}
      <Modal visible={isModalOpen} animationType="slide">
        <SafeAreaView style={[styles.modalBody, { backgroundColor: darkMode ? '#020617' : '#fff' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000' }]}>{editingService ? 'Edycja' : 'Nowa usługa'}</Text>
            <TouchableOpacity onPress={resetForm}><X size={28} color={darkMode ? '#fff' : '#000'} /></TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.label}>KATEGORIA</Text>
            <View style={[styles.pickerBox, { backgroundColor: darkMode ? '#0f172a' : '#f1f5f9' }]}>
              <Picker
                selectedValue={formData.categoryId}
                onValueChange={(v) => setFormData({...formData, categoryId: v})}
                style={{ color: darkMode ? '#fff' : '#000' }}
              >
                <option label="Bez kategorii" value="" />
                {categories.map(c => <option key={c.id} label={c.name} value={c.id} />)}
              </Picker>
            </View>

            <Text style={styles.label}>NAZWA USŁUGI</Text>
            <TextInput
              style={[styles.input, { backgroundColor: darkMode ? '#0f172a' : '#f1f5f9', color: darkMode ? '#fff' : '#000' }]}
              value={formData.name}
              onChangeText={(v) => setFormData({...formData, name: v})}
            />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={styles.label}>CENA NETTO</Text>
                <TextInput
                  keyboardType="numeric"
                  style={[styles.input, { backgroundColor: darkMode ? '#0f172a' : '#f1f5f9', color: darkMode ? '#fff' : '#000' }]}
                  value={formData.netPrice}
                  onChangeText={(v) => setFormData({...formData, netPrice: v})}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>J.M.</Text>
                <View style={[styles.pickerBox, { backgroundColor: darkMode ? '#0f172a' : '#f1f5f9' }]}>
                  <Picker
                    selectedValue={formData.unit}
                    onValueChange={(v) => setFormData({...formData, unit: v as UnitOfMeasure})}
                    style={{ color: darkMode ? '#fff' : '#000' }}
                  >
                    <option label="m2" value="m2" />
                    <option label="mb" value="mb" />
                    <option label="szt" value="szt" />
                  </Picker>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={handleSubmit} style={styles.saveBtn}>
              <Save size={20} color="#fff" />
              <Text style={styles.saveBtnText}>ZAPISZ USŁUGĘ</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const ServiceCard = ({ service, darkMode, onEdit, onDelete }: any) => (
  <View style={[styles.card, { backgroundColor: darkMode ? '#0f172a' : '#fff', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }]}>
    <Text style={[styles.cardTitle, { color: darkMode ? '#f1f5f9' : '#0f172a' }]} numberOfLines={2}>{service.name.toUpperCase()}</Text>
    <Text style={styles.cardPrice}>{service.netPrice} zł <Text style={styles.cardUnit}>/ {service.unit}</Text></Text>
    <View style={styles.cardActions}>
      <TouchableOpacity onPress={onEdit} style={styles.actionBtn}><Edit2 size={14} color="#3b82f6" /></TouchableOpacity>
      <TouchableOpacity onPress={onDelete} style={styles.actionBtn}><Trash2 size={14} color="#ef4444" /></TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', padding: 16, gap: 10 },
  searchWrapper: { flex: 1, height: 50, borderRadius: 15, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, fontWeight: 'bold' },
  catBtn: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  catSection: { marginBottom: 20 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, marginBottom: 10 },
  catTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', borderRadius: 20, padding: 15, borderWidth: 1, justifyContent: 'space-between' },
  cardTitle: { fontSize: 11, fontWeight: '900', marginBottom: 8 },
  cardPrice: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
  cardUnit: { fontSize: 8, color: '#64748b' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 5 },
  actionBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 10 },
  fab: { position: 'absolute', bottom: 30, right: 24, width: 64, height: 64, borderRadius: 24, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalBody: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  label: { fontSize: 9, fontWeight: '900', color: '#64748b', marginBottom: 5, marginTop: 15 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 15, fontWeight: 'bold' },
  pickerBox: { borderRadius: 12, height: 50, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#2563eb', height: 60, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 30 },
  saveBtnText: { color: '#fff', fontWeight: '900' }
});

export default ServicesList;