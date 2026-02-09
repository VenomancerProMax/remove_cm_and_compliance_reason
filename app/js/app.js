let currentRecordId, triggeredByUser, application_stage = null;
let isValidForResend = false;

const SELECTORS = {
    popup: "popup",
    popupTitle: "popupTitle",
    popupMessage: "popupMessage",
    mainTitle: "main-title",
    loaderText: "loader-text"
};

ZOHO.embeddedApp.on("PageLoad", async function (e) {
    await initializeWidget(e);
});

ZOHO.embeddedApp.init();

async function initializeWidget(e) {
    try {
        if (e && e.EntityId) {
            currentRecordId = e.EntityId[0];
        } else {
            const pageInfo = await ZOHO.CRM.INTERACTION.getPageInfo();
            currentRecordId = pageInfo.recordId;
        }

        if (!currentRecordId) throw new Error("Unable to identify Record ID.");

        const record_response = await ZOHO.CRM.API.getRecord({ 
            Entity: "Company_Members", 
            approved: "both", 
            RecordID: currentRecordId 
        });

        if (!record_response || !record_response.data) throw new Error("Record not found.");
        
        const record_data = record_response.data[0];
        application_stage = record_data.Application_Stage;

        validateStage(application_stage);

        if (!isValidForResend) {
            showPopup("Action Restricted", "At this stage of the application, you can no longer remove a Company Member. Please coordinate with the CRM Team.", "restricted");
            document.getElementById("form-content").style.display = "none";
        }

        const userInfo = await ZOHO.CRM.CONFIG.getCurrentUser();
        triggeredByUser = userInfo.users[0].full_name;

        ZOHO.CRM.UI.Resize({ height: "450", width: "550" });

    } catch (err) {
        showPopup("Data Fetch Error", err.message, "restricted");
    }
}

function validateStage(stage) {
    const allowedStages = [
        "Start", 
        "Docs Sent for Signing", 
        "Submitted to Authority", 
        "KYB and KYC Forms Sent"
    ];
    isValidForResend = allowedStages.includes(stage);
}

function showPopup(titleText, message, type = "restricted") {
    const popup = document.getElementById(SELECTORS.popup);
    const iconDiv = document.getElementById("statusIcon");
    const title = document.getElementById(SELECTORS.popupTitle);
    const msg = document.getElementById(SELECTORS.popupMessage);
    
    popup.classList.remove("hidden");
    title.textContent = titleText;
    msg.innerHTML = message;
    
    if(type === "success") {
        popup.setAttribute("data-status", "success");
        iconDiv.className = "mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 bg-green-50 text-green-500 ring-8 ring-green-50/50";
        iconDiv.innerHTML = '<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>';
    } else {
        popup.setAttribute("data-status", "error");
        iconDiv.className = "mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 bg-amber-50 text-amber-500 ring-8 ring-amber-50/50";
        iconDiv.innerHTML = '<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>';
    }
}

function hidePopup() {
    const popup = document.getElementById("popup");
    const isSuccess = popup.getAttribute("data-status") === "success";
    
    if (isSuccess) {
        let target_url = "https://crm.zoho.com/crm/org682300086/tab/CustomModule32/" + currentRecordId;
        window.top.location.href = target_url;
    } else {
        ZOHO.CRM.UI.Popup.close();
    }
}

async function delete_record(event) {
    event.preventDefault();
    if (!isValidForResend) return;

    const reasonInput = document.getElementById("reason");
    const errorSpan = document.getElementById("reason-error");
    const loader = document.getElementById("loader-overlay");
    const submitBtn = event.submitter;

    reasonInput.classList.remove("border-red-500", "ring-red-100", "ring-2");
    errorSpan.classList.add("hidden");

    if (!reasonInput.value.trim()) {
        reasonInput.classList.add("border-red-500", "ring-red-100", "ring-2");
        errorSpan.textContent = "Please provide a reason for deletion.";
        errorSpan.classList.remove("hidden");
        return;
    }

    submitBtn.disabled = true;
    loader.classList.replace("hidden", "flex");

    try {
        const response = await ZOHO.CRM.FUNCTIONS.execute("delete_cm_and_compliance", {
            "arguments": JSON.stringify({
                "cm_id": currentRecordId,
                "notes": reasonInput.value.trim(),
                "triggered_by": triggeredByUser
            })
        });

        loader.classList.replace("flex", "hidden");

        if (response && response.code === "success") {
            showPopup("Removal Successful", "The Company Member was successfully removed. Please click the Close button below.", "success");
        } else {
            throw new Error(response.code || "Function error");
        }
    } catch (error) {
        loader.classList.replace("flex", "hidden");
        submitBtn.disabled = false;
        showPopup("Execution Failed", error.message, "restricted");
    }
}

document.getElementById("record-form").addEventListener("submit", delete_record);