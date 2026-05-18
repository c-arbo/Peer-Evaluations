const API_BASE = 'http://localhost:3000/api';

const tallyScoreHeader = `Class,Group,Student First Name,Student Last Name,Student Email,Student Score,Evaluation Submitted,Student Feedback (if provided)`;
var tallyScoreCSV = tallyScoreHeader;

(async () => {
    // Get scores
    const scoresResponse = await fetch(`${API_BASE}/scores`);
    const scores = await scoresResponse.json();

    // Get comments
    const commentsResponse = await fetch(`${API_BASE}/comments`);
    const comments = await commentsResponse.json();

    // Process scores for tally table
    const tallyValues = scores.reduce((acc, s) => {
        const key = `${s.student}-${s.class}-${s.group}`;
        if (!acc[key]) {
            acc[key] = { student: s.student, class: s.class, group: s.group, scores: [] };
        }
        acc[key].scores.push(s.score);
        return acc;
    }, {});

    var tableBuffer = "";
    Object.values(tallyValues).forEach(tallyValue => {
        const avg = tallyValue.scores.length > 0 ? tallyValue.scores.reduce((a, b) => a + b, 0) / tallyValue.scores.length : 0;
        const comment = comments.find(c => c.student === tallyValue.student && c.class === tallyValue.class) || { comment: "N/A" };

        tableBuffer += `
            <tr>
            <td>${tallyValue.class}</td>
            <td>${tallyValue.group}</td>
            <td>${tallyValue.student}</td>
            <td>${avg.toFixed(2)}</td>
            <td>Y</td>
            <td>${comment.comment}</td>
            </tr>`;

        tallyScoreCSV += `\n"${tallyValue.class}","${tallyValue.group}","${tallyValue.student.split("@")[0].split("_")[0]}","${tallyValue.student.split("@")[0].split("_")[1]}","${tallyValue.student}",${avg.toFixed(2)},"Y","${comment.comment}"`;
    });
    document.getElementById("tally").innerHTML += `<tbody>${tableBuffer}</tbody>`;

    // Comments table
    tableBuffer = "";
    comments.forEach(c => {
        tableBuffer += `
            <tr>
            <td>${c.class}</td>
            <td>${c.group}</td>
            <td>${c.reviewer}</td>
            <td>${c.comment}</td>
            </tr>`;
    });
    document.getElementById("feedback").innerHTML += `<tbody>${tableBuffer}</tbody>`;

    // Raw scores table
    tableBuffer = "";
    scores.forEach(s => {
        tableBuffer += `
            <tr>
            <td>${s.class}</td>
            <td>${s.group}</td>
            <td>${s.student}</td>
            <td>${s.reviewer}</td>
            <td>${s.score}</td>
            <td>${s._id ? new Date(s._id.getTimestamp()).toISOString() : new Date().toISOString()}</td>
            </tr>`;
    });
    document.getElementById("raw").innerHTML += `<tbody>${tableBuffer}</tbody>`;

    // Export buttons
    const downloadlink = document.getElementById("req-scoring-overview");
    downloadlink.href = URL.createObjectURL(new Blob([tallyScoreCSV], {type: "text/csv"}));
    downloadlink.download = `PeerEvaluations-${(new Date()).toISOString()}.csv`;
    downloadlink.hidden = false;

    // Delete button
    const deleteData = document.getElementById("delete-scoring-data");
    deleteData.onclick = async () => {
        await fetch(`${API_BASE}/data`, { method: 'DELETE' });
        window.location.reload();
    };
    deleteData.hidden = false;

    // Initialize DataTables
    $('#tally').DataTable();
    $('#feedback').DataTable();
    $('#raw').DataTable();
})();
