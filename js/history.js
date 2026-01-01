document.addEventListener("DOMContentLoaded", async ()=>{
    if(!document.getElementById("historyTable")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(API_URL + "practice/history.php", {
        headers:{ Authorization: token }
    });

    const data = await res.json();
    if(data.status){
        const tbody = document.querySelector("#historyTable tbody");
        data.data.forEach(s=>{
            tbody.innerHTML += `
                <tr>
                    <td>${s.date}</td>
                    <td>${s.course_name}</td>
                    <td>${s.topic_name}</td>
                    <td>${s.score}/${s.total}</td>
                    <td>${s.percentage}%</td>
                    <td>${s.advice}</td>
                </tr>
            `;
        });
    }
});
