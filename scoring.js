const tallyScoreHeader = `Class,Group,Student First Name,Student Last Name,Student Email,Student Score,Evaluation Submitted,Student Feedback (if provided)`;
var tallyScoreCSV = tallyScoreHeader;

// Demo mode flag
let useMongoDB = true;
let dbConnection = null;

(async () => {
    const app = new Realm.App({
        id: "application-0-tcpbe"
    });

    try {
        await app.logIn(Realm.Credentials.emailPassword("peer-evaluations@roshanravi.com", "PeerEvals@UML"));
        dbConnection = app.currentUser.mongoClient("mongodb-atlas");
    } catch (e) {
        console.log('MongoDB unavailable, using localStorage');
        useMongoDB = false;
        document.body.innerHTML += '<div class="alert alert-info">⚠️ Demo Mode: Using localStorage. Data won\'t persist across devices.</div>';
    }

    // Helper: Load from localStorage
    function loadFromLocalStorage(key) {
        const data = localStorage.getItem('peer_eval_' + key);
        return data ? JSON.parse(data) : [];
    }

    // Helper: Get scores
    async function getScores() {
        if (useMongoDB && dbConnection) {
            return await dbConnection.db("peer-evaluations").collection("scores").find({}, {}).toArray();
        } else {
            return loadFromLocalStorage('scores');
        }
    }

    // Helper: Get comments
    async function getComments() {
        if (useMongoDB && dbConnection) {
            return await dbConnection.db("peer-evaluations").collection("comments").find({}, {}).toArray();
        } else {
            return loadFromLocalStorage('comments');
        }
    }

    // Helper: Delete all data
    async function deleteAllData() {
        if (useMongoDB && dbConnection) {
            await dbConnection.db("peer-evaluations").collection("scores").deleteMany({});
            await dbConnection.db("peer-evaluations").collection("comments").deleteMany({});
        } else {
            localStorage.removeItem('peer_eval_scores');
            localStorage.removeItem('peer_eval_comments');
        }
    }

    const scores = await getScores();
    const comments = await getComments();

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
        await deleteAllData();
        window.location.reload();
    };
    deleteData.hidden = false;

    // Export button for localStorage data
    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-secondary';
    exportBtn.id = 'export-local';
    exportBtn.innerText = 'Export localStorage Data';
    exportBtn.onclick = () => {
        const data = {
            scores: loadFromLocalStorage('scores'),
            comments: loadFromLocalStorage('comments')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'peer-evals-backup.json';
        a.click();
    };
    document.getElementById('req-scoring-byclass').appendChild(exportBtn);

    // Import button for localStorage data
    const importBtn = document.createElement('button');
    importBtn.className = 'btn btn-secondary';
    importBtn.id = 'import-local';
    importBtn.innerText = 'Import localStorage Data';
    importBtn.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = event => {
                const data = JSON.parse(event.target.result);
                if(data.scores) saveToLocalStorage('scores', data.scores);
                if(data.comments) saveToLocalStorage('comments', data.comments);
                window.location.reload();
            };
            reader.readAsText(file);
        };
        input.click();
    };
    document.getElementById('req-scoring-byclass').appendChild(importBtn);

    // Helper function for import
    function saveToLocalStorage(key, data) {
        localStorage.setItem('peer_eval_' + key, JSON.stringify(data));
    }

    // Initialize DataTables
    $('#tally').DataTable();
    $('#feedback').DataTable();
    $('#raw').DataTable();
})();