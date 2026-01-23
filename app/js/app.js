let currentRecordId, triggeredByUser = null;

ZOHO.embeddedApp.on("PageLoad", async (e) => { 
    if(e && e.EntityId){
        currentRecordId = e.EntityId[0]; 
    }

    const userInfo = await ZOHO.CRM.CONFIG.getCurrentUser();
    triggeredByUser = userInfo.users[0].full_name;
    console.log("Triggered by:", triggeredByUser);

    ZOHO.CRM.UI.Resize({ height: "30%" }).then(function (data) {
      console.log("Resize result:", data);
    });
});

async function delete_record(event) {
    event.preventDefault();

    const reasonInput = document.getElementById("reason");
    const errorSpan = document.getElementById("reason-error");
    const loader = document.getElementById("loader-overlay");
    const reason_for_delete = reasonInput.value.trim();

    reasonInput.classList.remove("input-error");
    errorSpan.style.display = "none";

    if (!reason_for_delete) {
        reasonInput.classList.add("input-error");
        errorSpan.innerText = "Please provide a reason for deletion.";
        errorSpan.style.display = "block";
        return;
    }

    loader.style.display = "flex";

    // Function Display Name: Delete CM and Compliance
    // Associated function Display Name and API Name: Dev Remove Company Members and Compliance, dev_remove_company_members_and_compliance
    const func_name = "delete_cm_and_compliance";
    const req_data = {
        "arguments": JSON.stringify({
            "cm_id": currentRecordId,
            "notes": reason_for_delete,
            "triggered_by": triggeredByUser
        })
    };

    try {
        const response = await ZOHO.CRM.FUNCTIONS.execute(func_name, req_data);
        console.log("Response:", response);

       if (response && response.code === "success") {
            const targetUrl = "https://crm.zoho.com/crm/org682300086/tab/CustomModule32/custom-view/3769920000139267496/list";
            
            window.top.location.href = targetUrl;
        } else {
            throw new Error("Function returned an error: " + response.code);
        }
       
    } catch (error) {
        console.error("Error:", error);
        loader.style.display = "none";
        alert("Execution failed. Please check your connection.");
    }
}

document.getElementById("record-form").addEventListener("submit", delete_record);

ZOHO.embeddedApp.init();

