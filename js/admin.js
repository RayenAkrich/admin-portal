document.addEventListener('DOMContentLoaded', function () {
	const activateBtn = document.getElementById('activate-camera');
	const qrReaderDiv = document.getElementById('qr-reader');
	const memberInfo = document.getElementById('member-info');
	const adminError = document.getElementById('admin-error-message');
	const adminSuccess = document.getElementById('admin-success-message');
	let html5QrCode;
	let cameraActive = false;

	// Fetch and display members
	async function loadMembers() {
		try {
			const res = await fetch('https://admin-portal-447e.onrender.com/members');
			const members = await res.json();
			renderMembersTable(members);
		} catch (err) {
			if (memberInfo) {
				memberInfo.style.display = 'block';
				memberInfo.textContent = 'Erreur lors du chargement des membres.';
			}
		}
	}

	// Render members as a table
	function renderMembersTable(members) {
		if (!memberInfo) return;
		// Sort by name if available, otherwise by qrcode
		members.sort((a, b) => {
			const nameA = (a.name || a.named || '').toString();
			const nameB = (b.name || b.named || '').toString();
			return nameA.localeCompare(nameB);
		});
		let html = '<table style="width:100%;border-collapse:collapse;">';
		html += '<tr><th>Name</th><th>Présent</th><th>Date de check-in</th></tr>';
		members.forEach(m => {
			const present = !!m.present;
			const rowColor = present ? '#d1fae5' : '#fee2e2';
			const displayName = m.name || m.named || '';
			const displayCheckin = m.checkin_time || m.checkinTime || '';
			html += `<tr style="background:${rowColor};">
				<td>${displayName}</td>
				<td>${present ? 'Oui' : 'Non'}</td>
				<td>${displayCheckin ? new Date(displayCheckin).toLocaleString('fr-FR') : ''}</td>
			</tr>`;
		});
		html += '</table>';
		memberInfo.style.display = 'block';
		memberInfo.innerHTML = html;
	}

	if (activateBtn && qrReaderDiv) {
		activateBtn.addEventListener('click', async function () {
			if (cameraActive) return;
			cameraActive = true;
			activateBtn.disabled = true;
			activateBtn.textContent = 'Caméra activée...';
			qrReaderDiv.textContent = '';

			// Create the scanner
			html5QrCode = new Html5Qrcode("qr-reader");
			const config = { fps: 10, qrbox: 200 };

			try {
				await html5QrCode.start(
					{ facingMode: "environment" },
					config,
					async (decodedText, decodedResult) => {
						// Try to parse as JSON and extract email if possible
						// Try to parse as JSON and extract qrcode if possible
						let qrcode = decodedText;
						try {
							const parsed = JSON.parse(decodedText);
							if (parsed.qrcode) {
								qrcode = parsed.qrcode;
							}
						} catch (e) {}
						// Confirm before check-in
						if (confirm(`Confirmer le check-in pour : ${qrcode} ?`)) {
							await checkinMember(decodedText);
						}
						html5QrCode.stop();
						cameraActive = false;
						setTimeout(() => {
							activateBtn.disabled = false;
							activateBtn.textContent = 'Activer la caméra';
						}, 2000); // Prevent immediate rescan for 2 seconds
						loadMembers(); // Refresh table
					},
					(errorMessage) => {
						// Optionally handle scan errors
					}
				);
			} catch (err) {
				qrReaderDiv.textContent = 'Erreur lors de l\'accès à la caméra.';
				activateBtn.disabled = false;
				activateBtn.textContent = 'Activer la caméra';
				cameraActive = false;
			}
		});
	}

	// Send POST request to check in member
	async function checkinMember(scannedText) {
		let qrcode = scannedText;
		// Try to parse as JSON and extract qrcode if possible
		try {
			const parsed = JSON.parse(scannedText);
			if (parsed.qrcode) {
				qrcode = parsed.qrcode;
			}
		} catch (e) {
			// Not JSON, use as is
		}
		console.log('[DEBUG] QR code sent to backend:', qrcode);
		try {
			const res = await fetch('https://admin-portal-447e.onrender.com/checkin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ qrcode: qrcode })
			});
			const data = await res.json();
			if (res.ok) {
				// Prefer showing the member's name if provided by the server
				const displayName = data.named || data.qrcode || 'membre';
				showScanResult(`Check-in réussi pour : ${displayName}`);
			} else {
				showScanResult(data.error || 'Erreur lors du check-in.', true);
			}
		} catch (err) {
			showScanResult('Erreur lors du check-in.', true);
		}
	}

	function showScanResult(text, isError = false) {
		if (isError && adminError) {
			adminError.innerHTML = `<div class='error-message'>${text}</div>`;
			adminError.style.display = 'flex';
			setTimeout(() => {
				adminError.style.display = 'none';
				adminError.innerHTML = '';
				loadMembers();
			}, 2000);
		} else if (adminSuccess) {
			adminSuccess.innerHTML = `<div class='success-message'>${text}</div>`;
			adminSuccess.style.display = 'flex';
			setTimeout(() => {
				adminSuccess.style.display = 'none';
				adminSuccess.innerHTML = '';
				loadMembers();
			}, 2000);
		}
	}

	// Initial load
	loadMembers();
});

