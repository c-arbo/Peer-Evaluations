(async () => {
    const app = new Realm.App({
        id: "mongodb+srv://christopherarbogast_db_user:ZtaA%JQmZQ5U?Lr@cluster0.d6bcuuo.mongodb.net/?appName=Cluster0"
    });

    // Try MongoDB first, fall back to localStorage
    let useMongoDB = true;
    let dbConnection = null;

    try {
        await app.logIn(Realm.Credentials.anonymous());
        dbConnection = app.currentUser.mongoClient("mongodb-atlas");
    } catch (e) {
        console.log('MongoDB unavailable, using localStorage');
        useMongoDB = false;
    }

    const members = memberCSVData.split("\n").map((member) => {
        member = member.split(",").map(field => field.trim());
        firstName = member[2].split("@")[0].split("_")[0];
        lastName = member[2].split("@")[0].split("_").slice(1).join('');

        return {
          "Group": member[1],
          "Email": member[2],
          "First_Name": firstName[0].toUpperCase() + firstName.slice(1).toLowerCase(),
          "Last_Name": lastName[0].toUpperCase() + lastName.slice(1).toLowerCase(),
          "Class": member[0]
        }
    });

    // Helper: Save to localStorage
    function saveToLocalStorage(key, data) {
        localStorage.setItem('peer_eval_' + key, JSON.stringify(data));
    }

    // Helper: Load from localStorage
    function loadFromLocalStorage(key) {
        const data = localStorage.getItem('peer_eval_' + key);
        return data ? JSON.parse(data) : [];
    }

    // Helper: Save scores
    async function saveScores(scores) {
        if (useMongoDB && dbConnection) {
            const db = dbConnection.db("peer-evaluations");
            await db.collection("scores").insertMany(scores);
        } else {
            const existing = loadFromLocalStorage('scores');
            saveToLocalStorage('scores', existing.concat(scores));
        }
    }

    // Helper: Save comment
    async function saveComment(comment) {
        if (useMongoDB && dbConnection) {
            const db = dbConnection.db("peer-evaluations");
            await db.collection("comments").insertOne(comment);
        } else {
            const existing = loadFromLocalStorage('comments');
            saveToLocalStorage('comments', existing.concat(comment));
        }
    }

    $("#studentEmail").on('input', () => {
        activeMemberClasses = members.filter(member => (
            member.Email.toLowerCase() == document.getElementById("studentEmail").value.toLowerCase()
        ));

        if(activeMemberClasses.length > 0){
            $("#studentClass").html(activeMemberClasses.map(entry => `<option>${entry['Class']}</option>`));
            $("#req-form-class").show();
            $("#req-form-submit").show();
            $("#email-warn").hide();
        } else {
            $("#email-warn").show();
            $("#req-form-class").hide();
            $("#req-form-submit").hide();
        }
    });

    var activeMember;
    document.getElementById("req-form-submit").onclick = () => {
        activeMember = members.filter(member => (
            member.Email.toLowerCase() == document.getElementById("studentEmail").value.toLowerCase() &&
            member.Class.toLowerCase() == document.getElementById("studentClass").value.toLowerCase()
        ))[0];

        if(!activeMember) 
            document.getElementById("auth-fail").hidden = false;
        else
            document.getElementById("auth-fail").hidden = true;


        document.getElementById("member").innerText = `${activeMember.First_Name} ${activeMember.Last_Name} (${activeMember.Group.replace("_", " ")})`;

        const groupMembers = members.filter(member => (
            member.Class == activeMember.Class &&
            member.Group == activeMember.Group &&
            member.Email != activeMember.Email
        ));

        groupMembers.forEach(member =>{
            document.getElementById("scoring-form-input").innerHTML += 
                `<div> \
                    <p>${member.First_Name} ${member.Last_Name}: </p> \
                    <div class="form-check form-check-inline">\
                      <input class="form-check-input" type="radio" name="${btoa(member.Email)}" id="${btoa(member.Email)}-1" value="1">\
                      <label class="form-check-label" for="${btoa(member.Email)}">1</label>\
                    </div>\
                    <div class="form-check form-check-inline">\
                      <input class="form-check-input" type="radio" name="${btoa(member.Email)}" id="${btoa(member.Email)}-2" value="2">\
                      <label class="form-check-label" for="${btoa(member.Email)}">2</label>\
                    </div>\
                    <div class="form-check form-check-inline">\
                      <input class="form-check-input" type="radio" name="${btoa(member.Email)}" id="${btoa(member.Email)}-3" value="3">\
                      <label class="form-check-label" for="${btoa(member.Email)}">3</label>\
                    </div>\
                    <div class="form-check form-check-inline">\
                      <input class="form-check-input" type="radio" name="${btoa(member.Email)}" id="${btoa(member.Email)}-4" value="4">\
                      <label class="form-check-label" for="${btoa(member.Email)}">4</label>\
                    </div>\
                    <div class="form-check form-check-inline">\
                      <input class="form-check-input" type="radio" name="${btoa(member.Email)}" id="${btoa(member.Email)}-5" value="5">\
                      <label class="form-check-label" for="${btoa(member.Email)}">5</label>\
                    </div>\
                </div><hr>`;
        });

        document.getElementById("request-form").hidden = true;
        document.getElementById("scoring-form").hidden = false;
    };


    document.getElementById("scoring-form-submit").onclick = async () => {
        document.getElementById("eval-succ").hidden = true;
        document.getElementById("eval-fail").hidden = true;

        const scores = Array.from(document.querySelectorAll("[type=radio]:checked")).map(checked => ({
            student: atob(checked.name),
            score: Number(checked.value),
            reviewer: activeMember.Email,
            class: activeMember.Class,
            group: activeMember.Group
        }));

        try {
            await saveScores(scores);

            if(document.getElementById("feedbackTextbox").value && document.getElementById("feedbackTextbox") != ""){
                await saveComment({
                    reviewer: activeMember.Email,
                    class: activeMember.Class,
                    group: activeMember.Group,
                    comment: document.getElementById("feedbackTextbox").value
                });
            }

            document.getElementById("scoring-form").hidden = true;
            document.getElementById("eval-succ").hidden = false;
        } catch (e) {
            console.log('Submission Failed');
            document.getElementById("eval-fail").hidden = false;
        }
    };
})();