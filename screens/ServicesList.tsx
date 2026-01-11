import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Modal, Alert, SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAppContext } from '../store/AppContext';
import {
  Plus, Trash2, Edit2, Search, ChevronDown, ChevronRight,
  X, Save, FolderPlus
} from 'lucide-react-native';
import { Service, UnitOfMeasure, MaterialItem, MaterialMode, Category } from '../types';

const ServicesList: React.FC = () => {
  const { state, addService, updateService, setActiveScreen, deleteService, addCategory, deleteCategory } = useAppContext();
  const { darkMode, categories, services } = state;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    name: '', description: '', netPrice: '', vatRate: '8',
    unit: 'm2' as UnitOfMeasure, categoryId: 'cat_general', // DOMYŚLNIE OGÓLNA
    materialMode: 'estimated' as MaterialMode, estimatedMaterialPrice: '',
    materials: [] as MaterialItem[]
  });

  const handleAddCategory = async () => {
    if (!newCatName.trim()) {
      Alert.alert("Błąd", "Wpisz nazwę kategorii.");
      return;
    }
    const newCat: Category = { id: Date.now().toString(), name: newCatName.trim() };
    await addCategory(newCat);
    setNewCatName('');
    setIsCatModalOpen(false);
  };

useEffect(() => {
  setActiveScreen('Usługi'); // lub odpowiednia nazwa
}, []);
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
      // Jeśli puste, wymuszamy cat_general
      categoryId: formData.categoryId || 'cat_general',
      materialMode: formData.materialMode,
      estimatedMaterialPrice: formData.materialMode === 'estimated' ? parseFloat(formData.estimatedMaterialPrice) : 0,
      defaultMaterials: formData.materialMode === 'detailed' ? formData.materials : []
    };

    if (editingService) updateService(serviceData);
    else addService(serviceData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', netPrice: '', vatRate: '8',
      unit: 'm2', categoryId: 'cat_general',
      materialMode: 'estimated', estimatedMaterialPrice: '', materials: []
    });
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
      categoryId: service.categoryId || 'cat_general',
      materialMode: service.materialMode || 'estimated',
      estimatedMaterialPrice: service.estimatedMaterialPrice?.toString() || '',
      materials: service.defaultMaterials || []
    });
    setIsModalOpen(true);
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? '#020617' : '#f8fafc' }]}>

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
        {/* RENDEROWANIE KATEGORII Z BAZY */}
        {categories.map(cat => {
          const catServices = filteredServices.filter(s => s.categoryId === cat.id);
          const isCollapsed = collapsedCats[cat.id] || false;

          return (
            <View key={cat.id} style={styles.catSection}>
              <View style={styles.catHeader}>
                <TouchableOpacity
                  onPress={() => setCollapsedCats(prev => ({...prev, [cat.id]: !isCollapsed}))}
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                >
                  <Text style={[styles.catTitle, { color: darkMode ? '#94a3b8' : '#1e293b' }]}>
                      {cat.name.toUpperCase()} ({catServices.length})
                  </Text>
                  {isCollapsed ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#2563eb" />}
                </TouchableOpacity>

                {/* Blokada usuwania domyślnej kategorii */}
                {cat.id !== 'cat_general' && (
                  <TouchableOpacity onPress={() => {
                    Alert.alert("Usuń kategorię", `Czy usunąć "${cat.name}"? Usługi zostaną przeniesione do kategorii Ogólna.`, [
                      { text: "Anuluj", style: "cancel" },
                      { text: "Usuń", style: "destructive", onPress: () => deleteCategory(cat.id) }
                    ]);
                  }}>
                    <Trash2 size={16} color="#ef4444" opacity={0.6} />
                  </TouchableOpacity>
                )}
              </View>

              {!isCollapsed && (
                <View style={styles.serviceGrid}>
                  {catServices.map(service => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      darkMode={darkMode}
                      onEdit={() => handleEdit(service)}
                      onDelete={() => deleteService(service.id)}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* FALLBACK: Usługi które nie pasują do żadnej kategorii w state */}
        {(() => {
          const orphaned = filteredServices.filter(s => !categories.find(c => c.id === s.categoryId));
          if (orphaned.length === 0) return null;
          return (
            <View style={styles.catSection}>
              <Text style={[styles.catTitle, { color: '#ef4444', marginBottom: 10 }]}>NIEPRZYPISANE ({orphaned.length})</Text>
              <View style={styles.serviceGrid}>
                {orphaned.map(s => <ServiceCard key={s.id} service={s} darkMode={darkMode} onEdit={() => handleEdit(s)} onDelete={() => deleteService(s.id)} />)}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      <TouchableOpacity onPress={() => setIsModalOpen(true)} style={styles.fab}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>

      {/* MODAL KATEGORII */}
      <Modal visible={isCatModalOpen} transparent animationType="fade" onRequestClose={() => setIsCatModalOpen(false)}>
        <View style={styles.modalOverlay}>
            <View style={[styles.catModalContent, { backgroundColor: darkMode ? '#0f172a' : '#fff' }]}>
                <Text style={[styles.modalTitle, { color: darkMode ? '#fff' : '#000', marginBottom: 15 }]}>Nowa kategoria</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: darkMode ? '#1e293b' : '#f1f5f9', color: darkMode ? '#fff' : '#000' }]}
                    placeholder="Wpisz nazwę..."
                    placeholderTextColor="#64748b"
                    value={newCatName}
                    onChangeText={setNewCatName}
                />
                <View style={[styles.row, { marginTop: 20 }]}>
                    <TouchableOpacity onPress={() => setIsCatModalOpen(false)} style={[styles.saveBtn, { flex: 1, backgroundColor: '#64748b' }]}>
                        <Text style={styles.saveBtnText}>ANULUJ</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleAddCategory} style={[styles.saveBtn, { flex: 1, marginLeft: 10 }]}>
                        <Text style={styles.saveBtnText}>DODAJ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* MODAL USŁUGI */}
      <Modal visible={isModalOpen} animationType="slide" onRequestClose={resetForm}>
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
                dropdownIconColor={darkMode ? '#fff' : '#000'}
              >
                {categories.map(c => <Picker.Item key={c.id} label={c.name} value={c.id} />)}
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
                    <Picker.Item label="m2" value="m2" />
                    <Picker.Item label="mb" value="mb" />
                    <Picker.Item label="szt" value="szt" />
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

// Style pozostają bez zmian jak w oryginale
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  catModalContent: { width: '100%', borderRadius: 25, padding: 25, elevation: 10 },
  label: { fontSize: 9, fontWeight: '900', color: '#64748b', marginBottom: 5, marginTop: 15 },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 15, fontWeight: 'bold' },
  pickerBox: { borderRadius: 12, height: 50, justifyContent: 'center', overflow: 'hidden' },
  row: { flexDirection: 'row', gap: 10 },
  saveBtn: { backgroundColor: '#2563eb', height: 60, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
  saveBtnText: { color: '#fff', fontWeight: '900' }
});

export default ServicesList;