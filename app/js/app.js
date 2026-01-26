let currentRecordId, triggeredByUser, application_stage, application_id = null;
let isValidForResend = false;
let validationMessage = "";

const SELECTORS = {
  popup: "popup",
  popupTitle: "popupTitle",
  popupMessage: "popupMessage",
};

ZOHO.embeddedApp.on("PageLoad", async (e) => { 
    if(e && e.EntityId){
        currentRecordId = e.EntityId[0]; 
    }

    // get the current record to get the app record
    const record_response = await ZOHO.CRM.API.getRecord({ Entity: "Company_Members", approved: "both", RecordID: currentRecordId,});
    const record_data = record_response.data[0];

    application_id = record_data.Application_No.id;

    // application record to validate application stage
    const application_rseponse = await ZOHO.CRM.API.getRecord({ Entity: "Applications1", approved: "both", RecordID: application_id,});
    const application_data = application_rseponse.data[0];
    application_stage = application_data.New_Resident_Visa_Stage;

    const allowedStages = ["Start", "Docs Sent for Signing", "Submitted to Authority"];
    if (allowedStages.includes(application_stage)) {
        isValidForResend = true;
    } else {
        validationMessage = `Removal of Company Member and Compliance is only allowed when Application Stage is ${allowedStages.join(", ")}`;
    }


    const userInfo = await ZOHO.CRM.CONFIG.getCurrentUser();
    triggeredByUser = userInfo.users[0].full_name;
    console.log("Triggered by:", triggeredByUser);

    ZOHO.CRM.UI.Resize({ height: "30%" }).then(function (data) {
      console.log("Resize result:", data);
    });
});

function showPopup(message, type = "restricted") {
  const popup = document.getElementById(SELECTORS.popup);
  popup.classList.remove("hidden");
  popup.classList.toggle("success", type === "success");
  popup.classList.toggle("restricted", type !== "success");
  document.getElementById(SELECTORS.popupTitle).textContent = "Action Status";
  document.getElementById(SELECTORS.popupMessage).innerHTML = message;
}

function hidePopup() {
    const popup = document.getElementById("popup");
    popup.classList.add("hidden");
    popup.classList.remove("success", "restricted");
    const targetUrl = "https://crm.zoho.com/crm/org682300086/tab/CustomModule32/custom-view/3769920000139267496/list";
    window.top.location.href = targetUrl;
}

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

    if (!isValidForResend) {
        reasonInput.classList.add("input-error");
        errorSpan.innerHTML =`${validationMessage}`;
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
           showPopup("Company Member and associated Compliance record has been removed successfully", "success");
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

