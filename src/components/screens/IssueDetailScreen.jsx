import React, { useCallback, useRef, useState, useMemo } from 'react';
import useAppStore from '../../store/useAppStore';
import GoogleMap from '../common/GoogleMap';
import './IssueDetailScreen.css';

/**
 * IssueDetailScreen Component
 * 
 * Properly integrates Google Maps with:
 * 1. Environment variables for API key
 * 2. Status-based marker filtering
 * 3. Search functionality (simulated)
 * 4. Responsive Dual-View sync
 */
const IssueDetailScreen = ({ variant = 'mobile', isTabPage = false }) => {
    const isMobile = variant === 'mobile';

    // Global State
    const issues = useAppStore(state => state.issues);
    const selectedIssueId = useAppStore(state => state.selectedIssueId);
    const currentUser = useAppStore(state => state.currentUser);
    const setSelectedIssueId = useAppStore(state => state.setSelectedIssueId);
    const navigate = useAppStore(state => state.navigate);

    // Local Map State
    const mapRef = useRef(null);

    // UI State
    const [isSheetOpen, setIsSheetOpen] = useState(!!selectedIssueId);
    const [isMarkerClick, setIsMarkerClick] = useState(false); // Track if opened via marker click
    const [mapFilter, setMapFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const selectedIssue = issues.find(i => i.id === selectedIssueId);

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            if (mapFilter === 'All') return true;
            if (mapFilter === 'in_progress') return issue.status === 'assigned' || issue.status === 'in_progress' || issue.status === 'Processing';
            if (mapFilter === 'completed') return issue.status === 'completed' || issue.status === 'verified' || issue.status === 'Verified';
            return issue.status === mapFilter || issue.status === 'Pending';
        });
    }, [issues, mapFilter]);

    const markers = useMemo(() => {
        return filteredIssues.filter(i => i.coordinates && i.coordinates.length >= 2).map(issue => ({
            position: { lat: issue.coordinates[1], lng: issue.coordinates[0] },
            id: issue.id,
            icon: {
                url: (issue.status === 'pending' || issue.status === 'Pending') ? 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' :
                    (issue.status === 'assigned' || issue.status === 'in_progress' || issue.status === 'Processing') ? 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png' :
                        'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
        }));
    }, [filteredIssues]);

    const handleMarkerClick = (marker) => {
        setSelectedIssueId(marker.id);
        setIsSheetOpen(true);
        setIsMarkerClick(true); // Flag as marker click to hide details button
        if (mapRef.current) {
            mapRef.current.panTo(marker.position);
            mapRef.current.setZoom(15);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchQuery.trim() && mapRef.current) {
            // Simulated Geocoding
            const randomPos = {
                lat: 13.0850 + (Math.random() - 0.5) * 0.05,
                lng: 80.2201 + (Math.random() - 0.5) * 0.05
            };
            mapRef.current.panTo(randomPos);
            mapRef.current.setZoom(14);
        }
    };

    const handleBack = () => {
        if (currentUser?.role === 'official') {
            navigate('official-dashboard');
        } else if (currentUser?.role === 'worker') {
            navigate('worker-dashboard');
        } else {
            navigate('home');
        }
    };

    const getStatusInfo = (status) => {
        const s = (status || '').toLowerCase();
        switch (s) {
            case 'pending': return { color: '#fef3c7', text: '#d97706', label: 'Pending' };
            case 'assigned':
            case 'in_progress':
            case 'processing': return { color: '#dbeafe', text: '#2563eb', label: 'In Progress' };
            case 'completed':
            case 'verified': return { color: '#dcfce7', text: '#16a34a', label: 'Verified' };
            default: return { color: '#f3f4f6', text: '#374151', label: 'Unknown' };
        }
    };

    const statusStyle = selectedIssue ? getStatusInfo(selectedIssue.status) : null;

    const center = useMemo(() => {
        if (selectedIssue && selectedIssue.coordinates && selectedIssue.coordinates.length >= 2) {
            return { lat: selectedIssue.coordinates[1], lng: selectedIssue.coordinates[0] };
        }
        return { lat: 13.0850, lng: 80.2201 };
    }, [selectedIssue]);

    return (
        <div className={`detail-root ${!isMobile ? 'detail-root--desktop' : 'detail-root--mobile'}`}>
            <div className="map-overlay-controls">
                <div className="search-bar-map">
                    <span className="material-symbols-outlined search-icon">search</span>
                    <input
                        type="text"
                        placeholder="Search location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                    <span className="material-symbols-outlined filter-icon">tune</span>
                </div>

                <div className="filter-chips">
                    <div
                        className={`filter-chip ${mapFilter === 'All' ? 'active' : ''}`}
                        onClick={() => setMapFilter('All')}
                    >All</div>
                    <div
                        className={`filter-chip chip-pending ${mapFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setMapFilter('pending')}
                    ><div className="chip-dot" /> Pending</div>
                    <div
                        className={`filter-chip chip-processing ${mapFilter === 'in_progress' ? 'active' : ''}`}
                        onClick={() => setMapFilter('in_progress')}
                    ><div className="chip-dot" /> In Progress</div>
                    <div
                        className={`filter-chip chip-verified ${mapFilter === 'completed' ? 'active' : ''}`}
                        onClick={() => setMapFilter('completed')}
                    ><div className="chip-dot" /> Resolved</div>
                </div>

                {!isTabPage && (
                    <div className="map-back-btn" onClick={handleBack}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>arrow_back</span>
                    </div>
                )}
            </div>

            <div className="map-container">
                <GoogleMap
                    center={center}
                    zoom={15}
                    onLoad={onMapLoad}
                    markers={markers}
                    onMarkerClick={handleMarkerClick}
                />
            </div>

            {selectedIssue && (
                <div className={`bottom-sheet ${isSheetOpen ? 'open' : ''}`}>
                    <div className="sheet-handle" onClick={() => setIsSheetOpen(!isSheetOpen)} />

                    <div className="sheet-content">
                        <div className="sheet-header">
                            <span className="issue-category-badge">{(selectedIssue.category || 'General').toUpperCase()}</span>
                            <div className="status-badge-mini" style={{ backgroundColor: statusStyle.color, color: statusStyle.text }}>
                                <div className="dot" style={{ backgroundColor: statusStyle.text }} /> {statusStyle.label}
                            </div>
                        </div>

                        <h2 className="sheet-title">{selectedIssue.title}</h2>
                        <div className="sheet-meta">Reported {selectedIssue.date} • 0.2 miles away</div>

                        {!isMarkerClick && (
                            <div className="sheet-actions">
                                <button
                                    className="primary-btn view-details-btn"
                                    onClick={() => {
                                        setSelectedIssueId(selectedIssue.id);
                                        navigate('full-issue-details');
                                    }}
                                >
                                    View Details <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssueDetailScreen;
