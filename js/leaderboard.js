document.addEventListener("DOMContentLoaded", async ()=>{
    if(!document.getElementById("leaderboardTable")) return;

    const token = localStorage.getItem("token");
    const res = await fetch(API_URL + "leaderboard.php", {
        headers:{ Authorization: token }
    });

    const data = await res.json();
    if(data.status){
        const tbody = leaderboardTable.querySelector("tbody");
        data.data.forEach((u,i)=>{
            tbody.innerHTML += `
                <tr>
                    <td>${i+1}</td>
                    <td>${u.name}</td>
                    <td>${u.total_score}</td>
                    <td>${u.avg_percent}%</td>
                </tr>
            `;
        });
    }
});
